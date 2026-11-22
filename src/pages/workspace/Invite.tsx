import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Check, Copy, Download, MessageCircle, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Button, ButtonLink, Card, PageHeader } from '@/components/ui';

export default function Invite() {
  const { reunion: r, actions, base, isOrganizer } = useWorkspace();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const link = `${window.location.origin}/join/${r.inviteToken}`;
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 1, color: { dark: '#14213D', light: '#FFFFFF' }, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [link]);

  const message = `You're invited to "${r.name}" on BACK2CAMPUS! Join our reunion workspace to vote on the date and venue: ${link}`;

  async function copy() {
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard blocked: the link is still visible */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title={isNew ? 'Your reunion is live' : 'Invite people'} subtitle="Everyone joins the same private workspace" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col items-center gap-5 rounded-3xl bg-navy p-6 text-white">
          <div className="flex w-full items-center justify-between text-xs text-soft"><span>Reunion ID</span><strong className="tracking-wider text-white">{r.code}</strong></div>
          <div className="rounded-3xl bg-white p-4">
            {qr ? <img src={qr} alt={`QR code that opens the invitation link for ${r.name}`} width={220} height={220} /> : <div className="h-[220px] w-[220px]" />}
          </div>
          <div className="flex w-full items-center gap-2 rounded-2xl bg-navy-2 p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate text-sm">{link.replace(/^https?:\/\//, '')}</span>
            <Button size="sm" variant="light" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}</Button>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange font-bold text-navy"><MessageCircle size={18} /> WhatsApp</a>
            <a href={qr || undefined} download={`back2campus-${r.code}.png`} aria-disabled={!qr}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold text-white ring-[1.5px] ring-navy-3"><Download size={18} /> Download QR</a>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-5">
            <strong>Message preview</strong>
            <p className="rounded-2xl bg-[#E7F7E1] p-4 text-sm leading-relaxed">{message}</p>
          </Card>
          {isOrganizer && (
            <Card className="flex flex-col gap-4 p-5">
              <label className="flex items-center justify-between gap-4">
                <span><strong className="text-sm">Approve join requests</strong><span className="block text-xs text-muted">Review each person before they can see the workspace</span></span>
                <input type="checkbox" checked={r.requireApproval} onChange={(e) => actions.setSettings({ requireApproval: e.target.checked })} className="h-6 w-6 accent-orange" />
              </label>
              <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
                <span><strong className="text-sm">Reset the link</strong><span className="block text-xs text-muted">The old link and QR stop working immediately</span></span>
                <Button size="sm" variant="ghost" onClick={() => actions.resetInvite()}><RefreshCw size={16} /> Reset</Button>
              </div>
            </Card>
          )}
          <ButtonLink to={base} size="lg">Go to the reunion workspace</ButtonLink>
        </div>
      </div>
    </div>
  );
}
