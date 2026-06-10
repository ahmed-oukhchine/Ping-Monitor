<?php

namespace App\Services;

use App\Models\Target;
use Illuminate\Support\Facades\Log;

class SnmpService
{
    const OID_SYS_NAME      = '.1.3.6.1.2.1.1.5.0';
    const OID_SYS_DESCR     = '.1.3.6.1.2.1.1.1.0';
    const OID_SYS_UPTIME    = '.1.3.6.1.2.1.1.3.0';

    const OID_IF_NUMBER     = '.1.3.6.1.2.1.2.1.0';
    const OID_IF_DESCR      = '.1.3.6.1.2.1.2.2.1.2';
    const OID_IF_TYPE       = '.1.3.6.1.2.1.2.2.1.3';
    const OID_IF_SPEED      = '.1.3.6.1.2.1.2.2.1.5';
    const OID_IF_MAC        = '.1.3.6.1.2.1.2.2.1.6';
    const OID_IF_ADMIN_STATUS = '.1.3.6.1.2.1.2.2.1.7';
    const OID_IF_OPER_STATUS  = '.1.3.6.1.2.1.2.2.1.8';
    const OID_IF_IN_OCTETS  = '.1.3.6.1.2.1.2.2.1.10';
    const OID_IF_OUT_OCTETS = '.1.3.6.1.2.1.2.2.1.16';

    public function get(Target $target, string $oid, int $timeout = 3): string|false
    {
        if (!$target->snmp_enabled || !$target->snmp_community) {
            return false;
        }
        try {
            $result = @snmp2_get($target->ip_address, $target->snmp_community, $oid, $timeout);
            return $result === false ? false : (is_array($result) ? ($result[0] ?? false) : $result);
        } catch (\Throwable $e) {
            Log::warning("SNMP get failed for {$target->ip_address}/{$oid}: {$e->getMessage()}");
            return false;
        }
    }

    public function walk(Target $target, string $oid, int $timeout = 5): array|false
    {
        if (!$target->snmp_enabled || !$target->snmp_community) {
            return false;
        }

        $snmpwalk = 'C:\usr\bin\snmpwalk.exe';
        if (file_exists($snmpwalk)) {
            return $this->walkViaCli($target, $oid, $timeout, $snmpwalk);
        }

        return $this->walkViaPhp($target, $oid, $timeout);
    }

    private function walkViaCli(Target $target, string $oid, int $timeout, string $binary): array|false
    {
        $ip   = $target->ip_address;
        $comm = $target->snmp_community;
        $o    = $oid;
        $v    = $target->snmp_version === '1' ? '1' : '2c';

        $cmd = sprintf('"%s" -v %s -c %s -OQn -t %d %s %s',
            $binary, $v, $comm, $timeout, $ip, $o);

        $lines = [];
        $code  = 0;
        exec($cmd, $lines, $code);

        if (empty($lines)) {
            return false;
        }

        $results = [];
        $prefix  = rtrim($oid, '.') . '.';
        $buffer  = '';
        $bufferKey = null;

        foreach ($lines as $line) {
            $line = rtrim($line);
            if ($line === '') continue;

            if (preg_match('/^(\.\S+)/', $line, $m)) {
                if ($bufferKey !== null) {
                    $results[$bufferKey] = $this->decodeHexValue($buffer);
                }
                $buffer = $line;
                $bufferKey = str_starts_with($m[1], $prefix) ? $m[1] : null;
            } elseif ($bufferKey !== null) {
                $buffer .= ' ' . trim($line);
            }
        }

        if ($bufferKey !== null) {
            $results[$bufferKey] = $this->decodeHexValue($buffer);
        }

        return empty($results) ? false : $results;
    }

    private function decodeHexValue(string $raw): string
    {
        if (preg_match('/=\s*"(.*?)"\s*$/s', $raw, $m)) {
            $hex = trim($m[1]);
            $bytes = '';
            foreach (explode(' ', $hex) as $h) {
                if (strlen($h) === 2 && ctype_xdigit($h)) {
                    $bytes .= chr(hexdec($h));
                }
            }
            return rtrim($bytes, "\0");
        }
        if (preg_match('/=\s*(.+)$/s', $raw, $m)) {
            return rtrim(trim($m[1]), "\0");
        }
        return '';
    }

    private function walkViaPhp(Target $target, string $oid, int $timeout): array|false
    {
        try {
            $result = @snmp2_real_walk($target->ip_address, $target->snmp_community, $oid, $timeout);
            return $result === false ? false : $result;
        } catch (\Throwable $e) {
            Log::warning("SNMP PHP walk failed for {$target->ip_address}/{$oid}: {$e->getMessage()}");
            return false;
        }
    }

    public function discoverInterfaces(Target $target): array
    {
        $raw = $this->walk($target, self::OID_IF_DESCR);
        if ($raw === false) return [];

        $interfaces = [];
        foreach ($raw as $oid => $value) {
            preg_match('/\.(\d+)$/', $oid, $m);
            $index = (int) ($m[1] ?? 0);
            if ($index === 0) continue;

            $name = $this->parseSnmpValue($value);
            $type = $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_TYPE . ".$index")
            );
            $speed = (int) $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_SPEED . ".$index")
            );
            $mac = $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_MAC . ".$index")
            );

            $interfaces[] = [
                'snmp_index' => $index,
                'name' => $name,
                'description' => $name,
                'type' => $type,
                'speed' => $speed ?: null,
                'mac_address' => $mac ?: null,
                'is_up' => false,
                'in_octets' => 0,
                'out_octets' => 0,
            ];
        }
        return $interfaces;
    }

    public function pollInterfaces(Target $target): array
    {
        $ifaces = \App\Models\NetworkInterface::where('target_id', $target->id)->get();
        $results = [];

        foreach ($ifaces as $iface) {
            $idx = $iface->snmp_index;

            $oper = (int) $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_OPER_STATUS . ".$idx")
            );
            $in  = (int) $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_IN_OCTETS . ".$idx")
            );
            $out = (int) $this->parseSnmpValue(
                $this->walkSingle($target, self::OID_IF_OUT_OCTETS . ".$idx")
            );

            $results[$idx] = [
                'is_up' => $oper === 1,
                'in_octets' => $in,
                'out_octets' => $out,
            ];
        }
        return $results;
    }

    private function walkSingle(Target $target, string $oid): string|false
    {
        return $this->get($target, $oid);
    }

    private function parseSnmpValue(mixed $value): string
    {
        if ($value === false || $value === null) return '';
        $s = trim((string) (is_array($value) ? reset($value) : $value));
        if (preg_match('/^STRING:\s*(.+)$/i', $s, $m)) {
            return rtrim(trim($m[1]), "\0");
        }
        if (preg_match('/^INTEGER:\s*(.+)$/i', $s, $m)) {
            $v = trim($m[1]);
            if (preg_match('/\((\d+)\)/', $v, $d)) return $d[1];
            if (preg_match('/^(\d+)/', $v, $d)) return $d[1];
            return $v;
        }
        if (preg_match('/^Hex-STRING:\s*(.+)$/i', $s, $m)) {
            $hex = trim($m[1]);
            $bytes = '';
            foreach (explode(' ', $hex) as $h) {
                $bytes .= chr(hexdec($h));
            }
            return rtrim($bytes, "\0");
        }
        return rtrim($s, "\0");
    }
}
