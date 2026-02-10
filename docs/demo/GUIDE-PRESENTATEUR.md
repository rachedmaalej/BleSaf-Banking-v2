# Guide du Presentateur — Reference Rapide

> Fiche a imprimer ou garder ouverte sur un ecran secondaire pendant la demo.

---

## Identifiants de Connexion

| Role | Email | Mot de passe |
|------|-------|-------------|
| Super Admin | `admin@blesaf.app` | `demo123` |
| Bank Admin (HQ) | `bank.admin@demo-bank.tn` | `demo123` |
| BM Lac 2 | `manager@demo-bank.tn` | `demo123` |
| Guichetier 1 | `teller1@demo-bank.tn` | `demo123` |
| Guichetier 2 | `teller2@demo-bank.tn` | `demo123` |

---

## URLs des Ecrans (app live en backup)

| Ecran | URL | Connexion requise |
|-------|-----|-------------------|
| Kiosk | `localhost:5173/kiosk/{branchId}` | Non |
| TV Display | `localhost:5173/display/{branchId}` | Non |
| Guichetier | `localhost:5173/teller` | Oui (teller) |
| BM Dashboard V2 | `localhost:5173/manager/v2` | Oui (BM) |
| HQ Dashboard V2 | `localhost:5173/admin/v2` | Oui (bank_admin) |
| Admin Users | `localhost:5173/admin/users` | Oui (bank_admin) |

> **Note :** Le `{branchId}` est un UUID genere par le seed. Consultez la sortie de `pnpm db:seed-demo` pour l'obtenir, ou allez sur `/admin/branches` pour le trouver.

---

## Supports Visuels HTML (demo principale)

| Fichier | Usage | Acte |
|---------|-------|------|
| `docs/demo/visuals/snapshots-visuels.html` | Maquettes des 6 etats cles | Actes 1 & 2 |
| `docs/demo/visuals/tableau-agences.html` | Matrice HQ des 5 agences | Acte 3 |
| `docs/demo/visuals/flux-clients.html` | Timeline des 36 clients | Reference / Q&A |

**Navigation snapshots :** Fleches gauche/droite du clavier ou boutons numerotes

---

## Arrangement des Onglets

```
[1] snapshots-visuels.html   ← Actes 1 & 2
[2] tableau-agences.html     ← Acte 3
[3] flux-clients.html        ← Si questions sur les donnees
[4] localhost:5173            ← App live en backup
```

---

## Checkpoints de Timing

| Minute | Ou vous devez etre | Snapshot |
|--------|-------------------|----------|
| 0:00 | Debut Acte 1 — Ecran TV vide | Snapshot 1 |
| 3:00 | TV Display avec file remplie | Snapshot 2 |
| 5:00 | Ecran Guichetier, WOW carillon | Snapshot 2 |
| 7:00 | VIP + No-Show | Snapshot 3 |
| 10:00 | **Debut Acte 2** — Pic de stress | Snapshot 4 |
| 14:00 | Recommandation IA "Ouvrir G3" | Snapshot 4 |
| 16:00 | Apres actions, amelioration | Snapshot 5 |
| 20:00 | **Debut Acte 3** — Matrice HQ | tableau-agences.html |
| 25:00 | Classement des agences | tableau-agences.html |
| 29:00 | Recapitulatif final | — |
| 30:00 | Questions | — |

---

## Actions Cles dans l'App Live (si backup necessaire)

| Action | Comment |
|--------|---------|
| Creer un ticket | Kiosk → choisir service → (phone optionnel) → "Obtenir un ticket" |
| Appeler le suivant | Teller → "Appeler" (bouton rouge) |
| Terminer un service | Teller → "Terminer" (bouton noir) |
| Marquer non-presente | Teller → "Non-presente" (bouton outline) |
| Bump VIP | BM Dashboard → table file → "Prioriser" sur un ticket |
| Ouvrir un guichet | BM Dashboard → grille guichets → cliquer le guichet gris |
| Envoyer annonce | BM Dashboard → icone megaphone → ecrire texte → envoyer |
| Pause de file | BM Dashboard → bouton pause dans KPI strip |
| Mettre en pause un teller | BM Dashboard → guichet → "Pause" → raison + duree |

---

## Problemes Courants et Solutions

| Probleme | Solution |
|----------|---------|
| Ecran blanc apres login | Rafraichir la page (F5) |
| Socket deconnecte (pas de mise a jour) | Rafraichir — la reconnexion est automatique |
| Aucun ticket dans la file | Relancer `pnpm db:seed-demo` |
| "Unauthorized" sur un ecran | Se reconnecter avec le bon identifiant |
| Jauge de sante affiche 0 | Le service AI a besoin de donnees — attendre 60s apres le seed |
| Le Kiosk affiche "Service indisponible" | La file est en pause — la reprendre depuis le BM dashboard |
| Redis connection error | Verifier que Redis est lance (`redis-server` ou Docker) |
| Port 3001 deja utilise | `npx kill-port 3001` puis relancer |
| Port 5173 deja utilise | `npx kill-port 5173` puis relancer |

---

## Plan de Secours — Si En Retard

### Acte 1 (retard > 2 min)
Sauter le detail du parcours kiosk. Aller directement au Snapshot 2 et dire : *"Le client a pris son ticket en 10 secondes. Voici ce qui se passe ensuite."*

### Acte 2 (retard > 2 min)
Sauter les fonctionnalites supplementaires (pauses, annonces). Passer directement du Snapshot 4 (recommandation) au Snapshot 5 (resultat) : *"Le directeur execute la recommandation. Regardez le resultat."*

### Acte 3 (retard > 2 min)
Combiner tendances + recommandations en une seule diapo. Sauter le tri detaille du tableau : *"Les tendances montrent une amelioration continue, et l'IA recommande des actions a l'echelle du reseau."*

---

## Checklist Pre-Demo (1h avant)

- [ ] `pnpm db:seed-demo` execute avec succes
- [ ] `pnpm dev` lance (API :3001 + Web :5173)
- [ ] Redis en cours d'execution
- [ ] 3 fichiers HTML ouverts dans le navigateur
- [ ] Navigation snapshots testee (fleches clavier)
- [ ] App live accessible sur localhost:5173
- [ ] Login teste avec `manager@demo-bank.tn`
- [ ] Son du laptop verifie (pour mentionner le carillon)
- [ ] Ce guide ouvert sur un ecran secondaire
- [ ] SCRIPT-DEMO.md ouvert ou imprime

---

## Les 8 Personnages — Aide-Memoire

| Nom | Role | Moment cle |
|-----|------|-----------|
| Amira | Premiere cliente, flux complet | Acte 1 debut |
| Karim | Depot, multi-services | Acte 1, file mixte |
| Youssef | VIP, badge dore | Acte 1, 6:00 |
| Nadia | Patiente, suivi mobile | Acte 1, 8:00 |
| Slim | No-show | Acte 1, 6:00 |
| Fatma | Transfert de service | Mentionne si questions |
| Rania | Longue attente, priorisee | Acte 2, 17:00 |
| Hassan | VIP tardif, bump | Acte 2, mentionne |

---

## Phrases Cles a Retenir

> *"En 10 secondes, le client a son ticket."*

> *"Un seul chiffre pour evaluer l'agence."*

> *"L'IA ne se contente pas de signaler — elle recommande et le directeur execute en un clic."*

> *"3 niveaux, 1 plateforme : Client, Agence, Reseau."*

> *"Vos concurrents n'ont pas ces outils de pilotage."*
