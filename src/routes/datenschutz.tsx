import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";

import { LegalPageLayout } from "@/components/LegalPageLayout";
import { legalConfig, legalCoreComplete } from "@/config/legal";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({ meta: [{ title: "Datenschutz – MeisterMe" }, { name: "robots", content: "index,follow" }] }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  const controller = [legalConfig.operatorName, legalConfig.legalForm].filter(Boolean).join(" ");
  const address = [legalConfig.street, [legalConfig.postalCode, legalConfig.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <LegalPageLayout title="Datenschutzerklärung" subtitle="Informationen zur Verarbeitung personenbezogener Daten bei der Nutzung von MeisterMe.">
      <p className="text-sm text-muted-foreground">Stand: 20. Juli 2026</p>

      {!legalCoreComplete && <div role="alert" className="my-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Verantwortlichenangaben noch unvollständig.</strong> Name und Anschrift werden vor dem öffentlichen Marktstart ergänzt.</p></div>}

      <section><h2>1. Verantwortlicher</h2><p>{controller || "Betreiber von MeisterMe"}{address && <><br />{address}</>}<br />E-Mail: <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a></p></section>

      <section><h2>2. Welche Daten wir verarbeiten</h2><p>Bei Registrierung und Nutzung verarbeiten wir insbesondere Stamm- und Kontaktdaten, Anmeldedaten, Rollen und Berechtigungen, Betriebs-, Kunden-, Projekt-, Aufmaß-, Angebots-, Rechnungs-, Zeit-, Personal- und Kommunikationsdaten sowie technisch erforderliche Verbindungs- und Protokolldaten. Welche fachlichen Inhalte gespeichert werden, bestimmt der jeweilige Betrieb.</p></section>

      <section><h2>3. Zwecke und Rechtsgrundlagen</h2><ul><li>Bereitstellung des Kontos und der vertraglich gewünschten App-Funktionen: Art. 6 Abs. 1 lit. b DSGVO.</li><li>Erfüllung gesetzlicher Aufbewahrungs-, Steuer- oder Auskunftspflichten: Art. 6 Abs. 1 lit. c DSGVO.</li><li>IT-Sicherheit, Missbrauchsvermeidung, Fehleranalyse und wirtschaftlicher Betrieb: Art. 6 Abs. 1 lit. f DSGVO.</li><li>Optional aktivierte Funktionen, die eine Einwilligung erfordern: Art. 6 Abs. 1 lit. a DSGVO; eine Einwilligung kann jederzeit für die Zukunft widerrufen werden.</li></ul></section>

      <section><h2>4. Daten im Auftrag eines Handwerksbetriebs</h2><p>Soweit ein Betrieb Daten seiner Beschäftigten, Kunden, Lieferanten oder sonstiger Personen in MeisterMe verarbeitet, ist regelmäßig der Betrieb Verantwortlicher. Der Betreiber von MeisterMe verarbeitet diese Daten nach Weisung als Auftragsverarbeiter. Die dafür erforderlichen Vereinbarungen und Löschregeln werden mit dem jeweiligen Betrieb festgelegt.</p></section>

      <section><h2>5. Hosting, Datenbank und Empfänger</h2><p>Die Anwendung wird bei Vercel gehostet; die Ausführungsregion ist Frankfurt am Main konfiguriert. Datenbank, Anmeldung und Dateispeicher werden über Supabase in der Region Frankfurt betrieben. Anbieter und deren Unterauftragnehmer können im Rahmen von Wartung, Sicherheit und Support Zugriff erhalten. Eine Übermittlung in Drittländer erfolgt nur auf Grundlage der Voraussetzungen der Art. 44 ff. DSGVO, insbesondere Angemessenheitsbeschlüssen oder EU-Standardvertragsklauseln.</p></section>

      <section><h2>6. KI-Funktionen</h2><p>Inhalte werden nur dann an den konfigurierten KI-Anbieter übermittelt, wenn ein Nutzer eine KI-Funktion ausdrücklich ausführt. Dazu können Aufmaßnotizen, Berichtsstichpunkte, Kundenanfragen oder E-Mail-Inhalte gehören. KI-Ergebnisse sind Entwürfe und werden nicht für ausschließlich automatisierte Entscheidungen mit rechtlicher oder vergleichbar erheblicher Wirkung eingesetzt. Sensible oder nicht erforderliche personenbezogene Daten sollen nicht eingegeben werden.</p></section>

      <section><h2>7. Speicherung im Endgerät</h2><p>MeisterMe speichert technisch erforderliche Sitzungs- und Offline-Informationen im Browser, damit Anmeldung, Sicherheit und die ausdrücklich gewünschte App-Nutzung funktionieren. Diese Speicherung ist für den Dienst erforderlich. Analyse-, Werbe- oder Profiling-Technologien sind derzeit nicht eingebunden; daher erscheint kein Einwilligungsbanner. Vor der späteren Einbindung optionaler Analyse- oder Marketingdienste wird eine erforderliche Einwilligung eingeholt.</p></section>

      <section><h2>8. Speicherdauer</h2><p>Kontodaten werden grundsätzlich für die Dauer des Vertrags- oder Nutzungsverhältnisses gespeichert. Fachliche Daten werden nach den Weisungen und Löschregeln des jeweiligen Betriebs gelöscht. Gesetzlich aufzubewahrende Geschäfts- und Abrechnungsunterlagen bleiben für die jeweils geltende Frist gespeichert. Sicherheitsprotokolle werden nur so lange aufbewahrt, wie sie für Schutz, Fehleranalyse und Nachweis erforderlich sind.</p></section>

      <section><h2>9. Ihre Rechte</h2><p>Betroffene Personen haben nach Maßgabe der DSGVO insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Einwilligungen können jederzeit für die Zukunft widerrufen werden. Anfragen können an <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a> gerichtet werden.</p></section>

      <section><h2>10. Beschwerderecht</h2><p>Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Zuständig ist insbesondere die Aufsichtsbehörde am Sitz des Verantwortlichen oder an Ihrem Aufenthalts- beziehungsweise Arbeitsort.</p></section>

      <section><h2>11. Sicherheit und Änderungen</h2><p>Wir setzen angemessene technische und organisatorische Maßnahmen ein, darunter verschlüsselte Übertragung, rollenbasierte Zugriffe und mandantengetrennte Datenbankregeln. Diese Erklärung wird angepasst, wenn sich Funktionen, eingesetzte Anbieter oder rechtliche Anforderungen ändern.</p></section>
    </LegalPageLayout>
  );
}

