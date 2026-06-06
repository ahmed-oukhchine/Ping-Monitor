<?php

namespace App\Mail;

use App\Models\PingHistory;
use App\Models\Target;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TargetDownAlert extends Mailable
{
    use Queueable, SerializesModels;

    public int $consecutive;

    public function __construct(public readonly Target $target)
    {
        $this->consecutive = PingHistory::where('target_id', $target->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->takeWhile(fn($p) => !$p->is_success)
            ->count();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[SIREN] Alert: {$this->target->name} is offline",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.target-down',
        );
    }
}
