# BléSaf Demo - Quick Reference Card

> **30 minutes | 3 Actes | 5 Ecrans | 1 Histoire**
> Agence Lac 2 — 26 Octobre 2024, 14:00-15:00

---

## Chronologie de la Demo

| Temps | Acte | Ecran | Action | Message Cle |
|-------|------|-------|--------|-------------|
| 0:00 | **Acte 1** | Borne | Ouvrir kiosk-mockup.html | "Le parcours client commence ici" |
| 0:02 | | Borne | Simuler le parcours Ines Hamdi | Selection langue > Service > Ticket |
| 0:04 | | TV | Basculer sur tv-display-mockup.html | "Le client voit sa position en temps reel" |
| 0:06 | | TV | Naviguer snapshots 14:00 > 14:10 | Montrer la file qui grandit |
| 0:08 | | Guichet | Basculer sur teller-mockup.html | "Le guichetier a tout sous les yeux" |
| 0:10 | **Acte 2** | BM | Basculer sur bm-dashboard-mockup.html | "Le directeur voit TOUT en un coup d'oeil" |
| 0:11 | | BM | Snapshot 14:00 — Score 95 | "Situation nominale ce matin" |
| 0:13 | | BM | Snapshot 14:10 — Score 82 | "L'IA detecte une tendance inquietante" |
| 0:14 | | BM | **Snapshot 14:15 — Score 48** | **"MOMENT WOW: L'IA alerte en temps reel!"** |
| 0:16 | | BM | Snapshot 14:30 — Score 68 | "G3 active, la situation se stabilise" |
| 0:18 | | BM | Snapshot 14:45 — Score 55 | "Impact de la pause G2 sur le SLA" |
| 0:20 | **Acte 3** | HQ | Basculer sur hq-dashboard-mockup.html | "Vision reseau pour le siege" |
| 0:22 | | HQ | Montrer le tableau des agences | "5 agences, 1 vue consolidee" |
| 0:24 | | HQ | Filtrer: Critiques | "Menzah en crise: SLA 45%" |
| 0:26 | | HQ | Montrer les recommandations | "L'IA pense au niveau du reseau" |
| 0:28 | | Tous | Recapitulatif | Revenir au launcher, resume |
| 0:30 | | | **FIN** | Q&A |

---

## Donnees Cles a Mentionner

### Acte 1 — Parcours Client
- **6 services** disponibles a la borne
- Ticket avec **QR code**, position en file, temps estime
- Notifications **SMS/WhatsApp** (quand integre)
- Affichage TV **temps reel** avec codes couleur par service

### Acte 2 — Tableau de Bord BM (Moments WOW)
| Snapshot | Score | File | SLA | Velocite | WOW |
|----------|-------|------|-----|----------|-----|
| 14:00 | 95 | 3 | 100% | +20/h | Tout va bien |
| 14:10 | 82 | 9 | 100% | +44/h | IA detecte la tendance |
| **14:15** | **48** | **19** | **100%** | **+84/h** | **ALERTE CRITIQUE!** |
| 14:30 | 68 | 18 | 100% | +12/h | G3 active, stabilisation |
| 14:45 | 55 | 20 | 61.5% | +8/h | Impact pause G2 |
| 15:00 | 45 | 17 | 50% | -8/h | SLA critique |

- **Score de sante** passe de 95 a 48 en 15 minutes
- **Recommandation IA**: "Ouvrir G3 immediatement" → clic → execute
- **Prevision**: Courbe de demande avec 87% de precision

### Acte 3 — Tableau de Bord HQ
| Agence | Score | SLA | Statut |
|--------|-------|-----|--------|
| Sousse Centre | 88 | 94.2% | Sain |
| Lac 2 | 65 | 50.0% | Attention |
| Ariana | 71 | 78.5% | Attention |
| **Menzah** | **42** | **45.0%** | **Critique** |
| Sfax Medina | 55 | 62.0% | Attention |

- **Score reseau**: 68/100
- **67 clients** en attente sur le reseau
- **Recommendation IA**: Transferer du personnel de Sousse vers Sfax

---

## Phrases de Transition

| De → Vers | Phrase |
|-----------|--------|
| Borne → TV | "Maintenant, mettons-nous a la place du client dans l'agence..." |
| TV → Guichet | "Et du cote du guichetier, que voit-il?" |
| Guichet → BM | "Passons maintenant aux commandes — le tableau du directeur d'agence." |
| BM → HQ | "Elevons la vue au niveau du reseau bancaire..." |
| HQ → Fin | "BléSaf couvre toute la chaine, du client au siege." |

---

## Identifiants de Secours (App Live)

| Role | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@blesaf.app | demo123 |
| Banque | bank.admin@demo-bank.tn | demo123 |
| Manager | manager@demo-bank.tn | demo123 |
| Guichetier | teller1@demo-bank.tn | demo123 |

**URLs Live:** Frontend `localhost:5173` | Backend `localhost:3001`

---

## Plan de Secours

| Probleme | Solution |
|----------|----------|
| Mockup ne charge pas | Verifier que demo-data.js est dans le meme dossier |
| Pas d'internet (fonts) | Les mockups fonctionnent sans les fonts Google (fallback sans-serif) |
| En avance (+5 min) | Approfondir les filtres HQ, montrer les tendances 7 jours |
| En retard (-5 min) | Reduire Acte 1 a 5 min (skip details guichet) |
| Question technique | "Excellente question — je vous montre ca dans l'app live apres" |
