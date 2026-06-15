<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'same-origin');

        $viteOrigin = '';
        $hotFile = public_path('hot');
        if ($hotFile && file_exists($hotFile)) {
            $server = trim(file_get_contents($hotFile));
            $parsed = parse_url($server);
            $host = $parsed['host'] ?? 'localhost';
            if ($host === '[::1]') $host = '127.0.0.1';
            $viteOrigin = ' ' . ($parsed['scheme'] ?? 'http') . '://' . $host . ':' . ($parsed['port'] ?? '5173');
        }

        $csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'$viteOrigin; style-src 'self' 'unsafe-inline'$viteOrigin; img-src 'self' data:; font-src 'self'$viteOrigin; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'";
        $response->headers->set('Content-Security-Policy', $csp);

        $response->headers->remove('X-Powered-By');

        return $response;
    }
}
