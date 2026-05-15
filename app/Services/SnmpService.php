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

    public function walk(Target $target, string $oid, int $timeout = 3): array|false
    {
        if (!$target->snmp_enabled || !$target->snmp_community) {
            return false;
        }
        try {
            $result = @snmp2_real_walk($target->ip_address, $target->snmp_community, $oid, $timeout);
            return $result === false ? false : $result;
        } catch (\Throwable $e) {
            Log::warning("SNMP walk failed for {$target->ip_address}/{$oid}: {$e->getMessage()}");
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
        if (is_array($value)) {
            $v = reset($value);
            return is_string($v) ? trim($v) : (string) $v;
        }
        return trim((string) $value);
    }
}
