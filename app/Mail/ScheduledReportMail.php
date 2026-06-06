<?php

namespace App\Mail;

use App\Models\ScheduledReport;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ScheduledReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        protected string $pdfPath,
        protected ScheduledReport $report,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[SIREN] {$this->report->name} — SLA Report",
        );
    }

    public function content(): object
    {
        return new \Illuminate\Mail\Mailables\Content(
            htmlString: view('emails.report', ['report' => $this->report])->render(),
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->pdfPath)
                ->as('sla-report.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
