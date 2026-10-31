# Changelog

Tutte le modifiche degne di nota a questo progetto saranno documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).

## [Unreleased]

### Changed
- Rinomina del progetto da OpenPitch a LavagnaTattica
- Rinomina del motore matematico in NucleoTattico
- Aggiornato remote origin a `https://github.com/marcorzzn/LavagnaTattica.git`
- Aggiornato nome pacchetto in `package.json` a `lavagna-tattica`
- Aggiornato hash autorità a `0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`
- Allineato il database client IndexedDB a `lavagnatattica-db`
- Aggiornati tutti i commenti, header dei moduli, interfacce e file di esportazione (`.json`, `.md`)

### Added
- Motore di animazione keyframe + azioni a 3 livelli (Level 1: Keyframe, Level 2: Actions, Level 3: Physics parameters)
- Supporto curve di Bézier quadratiche ed elevazione balistica 3D della palla con ombra proiettata al suolo
- Player fluido a 60 FPS con RequestAnimationFrame e scrubbing su timeline
- Action Editor con parametri fisici completi (velocità km/h, altezza cm, curvatura, contatto, durata) ed esportazione/importazione JSON
- Suite di test matematici per il motore di animazione (7/7 pass) integrata nell'audit automatico

### Known issues
- Il benchmark dichiara 48 gol ma mostra 26 righe (da allineare separatamente)
- Mancano ancora test unitari per i moduli `src/engine/` non coperti dall'audit
