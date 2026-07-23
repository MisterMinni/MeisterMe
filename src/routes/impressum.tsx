import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";

import { LegalPageLayout } from "@/components/LegalPageLayout";
import { legalConfig, legalCoreComplete } from "@/config/legal";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [{ title: "Impressum – MeisterMe" }, { name: "robots", content: "index,follow" }] }),
  component: ImpressumPage,
});

export function ImpressumPage() {
  const cityLine = [legalConfig.postalCode, legalConfig.city].filter(Boolean).join(" ");
  return (
    <LegalPageLayout title="Impressum" subtitle="Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG).">
      {!legalCoreComplete && (
        <div role="alert" className="mb-7 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Betreiberangaben noch unvollständig.</strong> Name und ladungsfähige Anschrift müssen vor dem öffentlichen Marktstart ergänzt werden. Die Anwendung kennzeichnet die Lücke bewusst, statt rechtliche Angaben zu erfinden.</p>
        </div>
      )}

      <section>
        <h2>Angaben zum Diensteanbieter</h2>
        <address className="not-italic">
          {legalConfig.operatorName && <strong>{legalConfig.operatorName}{legalConfig.legalForm ? ` ${legalConfig.legalForm}` : ""}</strong>}
          {legalConfig.operatorName && <br />}
          {legalConfig.street && <>{legalConfig.street}<br /></>}
          {cityLine && <>{cityLine}<br /></>}
          {legalConfig.representative && <>Vertreten durch: {legalConfig.representative}<br /></>}
        </address>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a>{legalConfig.phone && <><br />Telefon: <a href={`tel:${legalConfig.phone}`}>{legalConfig.phone}</a></>}</p>
      </section>

      {(legalConfig.registerCourt || legalConfig.registerNumber) && <section><h2>Registereintrag</h2><p>{legalConfig.registerCourt && <>Registergericht: {legalConfig.registerCourt}<br /></>}{legalConfig.registerNumber && <>Registernummer: {legalConfig.registerNumber}</>}</p></section>}
      {legalConfig.vatId && <section><h2>Umsatzsteuer</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {legalConfig.vatId}</p></section>}
      {legalConfig.contentResponsible && <section><h2>Verantwortlich für redaktionelle Inhalte</h2><p>Verantwortlich gemäß § 18 Abs. 2 MStV: {legalConfig.contentResponsible}</p></section>}

      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Die Bereitschaft oder Verpflichtung zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle wird vor Aufnahme eines Angebots an Verbraucher verbindlich festgelegt. MeisterMe richtet sich derzeit an Unternehmen und Handwerksbetriebe.</p>
      </section>
    </LegalPageLayout>
  );
}

