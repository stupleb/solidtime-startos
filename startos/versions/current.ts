import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.23.0:0',
  releaseNotes: {
    en_US:
      "Updated solidtime to 0.23.0, which includes PHP 8.3.37's security fixes and fixes calendar events shifting when dragged, time entries grouped under the wrong day around daylight saving changes, and a time entry's client not matching its project. Full release notes: https://github.com/solidtime-io/solidtime/releases/tag/v0.23.0",
    es_ES:
      'solidtime se actualizó a 0.23.0, que incluye las correcciones de seguridad de PHP 8.3.37 y corrige que los eventos del calendario se desplacen al arrastrarlos, que las entradas de tiempo se agrupen en el día equivocado en torno a los cambios de horario de verano y que el cliente de una entrada no coincida con su proyecto. Notas completas: https://github.com/solidtime-io/solidtime/releases/tag/v0.23.0',
    de_DE:
      'solidtime wurde auf 0.23.0 aktualisiert. Die Version enthält die Sicherheitskorrekturen von PHP 8.3.37 und behebt, dass sich Kalenderereignisse beim Ziehen verschieben, dass Zeiteinträge rund um die Zeitumstellung unter dem falschen Tag gruppiert werden und dass der Kunde eines Zeiteintrags nicht zu seinem Projekt passt. Vollständige Versionshinweise: https://github.com/solidtime-io/solidtime/releases/tag/v0.23.0',
    pl_PL:
      'Zaktualizowano solidtime do 0.23.0, które zawiera poprawki bezpieczeństwa z PHP 8.3.37 i naprawia przesuwanie się wydarzeń w kalendarzu przy przeciąganiu, grupowanie wpisów czasu pod złym dniem w okolicach zmiany czasu oraz niezgodność klienta wpisu z jego projektem. Pełne informacje o wydaniu: https://github.com/solidtime-io/solidtime/releases/tag/v0.23.0',
    fr_FR:
      "solidtime passe en 0.23.0, qui inclut les correctifs de sécurité de PHP 8.3.37 et corrige le décalage des événements du calendrier quand on les fait glisser, le regroupement des entrées de temps sous le mauvais jour autour des changements d'heure, et le client d'une entrée qui ne correspond pas à son projet. Notes de version complètes : https://github.com/solidtime-io/solidtime/releases/tag/v0.23.0",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
