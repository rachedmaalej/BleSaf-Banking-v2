# Donnees de Simulation — 36 Clients sur 60 Minutes

> Scenario realiste d'une matinee a l'Agence Lac 2, Tunis.
> Horaires : 08:00 - 09:00 | 3 guichets disponibles (G1, G2 ouverts, G3 ferme au depart)

---

## Configuration Initiale

| Element | Valeur |
|---------|--------|
| Agence | Agence Lac 2 — Les Berges du Lac, Tunis |
| Guichets | G1 (ouvert, Mohamed Sassi), G2 (ouvert, Leila Hamdi), G3 (ferme) |
| Services | Retrait (A), Releves (B), Depot (C), Prets (D), Change (E) |
| SLA cible | 15 minutes d'attente max |
| Objectif quotidien | 120 tickets servis |

---

## Tableau des Arrivees

### Phase 1 : Ouverture (08:00 - 08:15) — Demarrage calme

| N | Heure | Ticket | Service | Priorite | Nom | Telephone | Canal | Check-in | Remarque |
|---|-------|--------|---------|----------|-----|-----------|-------|----------|----------|
| 1 | 08:02 | A-001 | Retrait | Normale | Amira Ben Salem | +216 22 456 789 | SMS | Kiosk | **Personnage #1** — Premiere cliente |
| 2 | 08:04 | B-001 | Releves | Normale | Mehdi Khelifi | +216 24 111 222 | SMS | Kiosk | |
| 3 | 08:06 | A-002 | Retrait | Normale | Sonia Mrad | +216 55 333 444 | WhatsApp | Kiosk | |
| 4 | 08:08 | C-001 | Depot | Normale | Karim Gharbi | +216 55 123 456 | WhatsApp | Kiosk | **Personnage #2** — Le depot important |
| 5 | 08:11 | A-003 | Retrait | Normale | Imen Bouslama | +216 20 555 666 | SMS | Mobile | |
| 6 | 08:13 | E-001 | Change | Normale | Slim Bouazizi | — | Aucun | Kiosk | **Personnage #5** — Futur no-show |

### Phase 2 : Montee en charge (08:15 - 08:30) — File qui s'allonge

| N | Heure | Ticket | Service | Priorite | Nom | Telephone | Canal | Check-in | Remarque |
|---|-------|--------|---------|----------|-----|-----------|-------|----------|----------|
| 7 | 08:15 | B-002 | Releves | Normale | Nadia Trabelsi | +216 27 890 123 | SMS | Mobile | **Personnage #4** — La patiente |
| 8 | 08:16 | D-001 | Prets | **VIP** | Youssef Mansouri | +216 98 765 432 | SMS | Manuel | **Personnage #3** — Le VIP (entre par BM) |
| 9 | 08:18 | A-004 | Retrait | Normale | Hichem Ferjani | +216 23 777 888 | SMS | Kiosk | |
| 10 | 08:19 | A-005 | Retrait | Normale | Rania Mejri | +216 23 567 890 | WhatsApp | Kiosk | **Personnage #7** — Longue attente |
| 11 | 08:21 | C-002 | Depot | Normale | Walid Belhaj | +216 52 999 000 | SMS | Kiosk | |
| 12 | 08:23 | E-002 | Change | Normale | Fatma Cherif | +216 50 234 567 | SMS | Kiosk | **Personnage #6** — Le transfert |
| 13 | 08:24 | A-006 | Retrait | Normale | Sami Tlili | +216 26 444 555 | WhatsApp | Kiosk | |
| 14 | 08:26 | B-003 | Releves | Normale | Olfa Chaabane | +216 29 666 777 | SMS | Mobile | |
| 15 | 08:28 | A-007 | Retrait | Normale | Ramzi Kammoun | +216 21 888 999 | SMS | Kiosk | |

### Phase 3 : Pic du matin (08:30 - 08:40) — Affluence maximale

| N | Heure | Ticket | Service | Priorite | Nom | Telephone | Canal | Check-in | Remarque |
|---|-------|--------|---------|----------|-----|-----------|-------|----------|----------|
| 16 | 08:30 | D-002 | Prets | Normale | Mounir Gasmi | +216 97 222 333 | SMS | Kiosk | |
| 17 | 08:31 | A-008 | Retrait | Normale | Amel Ezzine | +216 22 100 200 | SMS | Kiosk | |
| 18 | 08:32 | C-003 | Depot | Normale | Ridha Oueslati | +216 54 300 400 | WhatsApp | Kiosk | |
| 19 | 08:33 | B-004 | Releves | Normale | Leila Ayari | +216 28 500 600 | SMS | Mobile | |
| 20 | 08:34 | A-009 | Retrait | Normale | Tarek Jaziri | +216 25 700 800 | WhatsApp | Kiosk | |
| 21 | 08:35 | E-003 | Change | Normale | Mourad Sahli | +216 50 900 100 | SMS | Kiosk | |
| 22 | 08:36 | A-010 | Retrait | Normale | Khaled Benayed | +216 21 200 300 | SMS | Kiosk | |
| 23 | 08:37 | C-004 | Depot | Normale | Ines Hammami | +216 56 400 500 | WhatsApp | Kiosk | |

### Phase 4 : Pic soutenu (08:40 - 08:50) — Pression maximale

| N | Heure | Ticket | Service | Priorite | Nom | Telephone | Canal | Check-in | Remarque |
|---|-------|--------|---------|----------|-----|-----------|-------|----------|----------|
| 24 | 08:40 | A-011 | Retrait | Normale | Habib Mejri | +216 22 600 700 | SMS | Kiosk | |
| 25 | 08:41 | B-005 | Releves | Normale | Asma Laabidi | +216 27 800 900 | SMS | Kiosk | |
| 26 | 08:42 | D-003 | Prets | Normale | Hassan Dridi | +216 97 345 678 | SMS | Kiosk | **Personnage #8** — VIP tardif |
| 27 | 08:43 | A-012 | Retrait | Normale | Fathi Gharbi | +216 24 100 200 | WhatsApp | Kiosk | |
| 28 | 08:44 | C-005 | Depot | Normale | Dalila Riahi | +216 53 300 400 | SMS | Kiosk | |
| 29 | 08:45 | E-004 | Change | Normale | Bilel Mtir | +216 50 500 600 | SMS | Kiosk | |
| 30 | 08:47 | A-013 | Retrait | Normale | Zeineb Haddad | +216 20 700 800 | WhatsApp | Mobile | |
| 31 | 08:49 | B-006 | Releves | Normale | Makrem Souissi | +216 29 900 100 | SMS | Kiosk | |

### Phase 5 : Decrue (08:50 - 09:00) — Retour au calme

| N | Heure | Ticket | Service | Priorite | Nom | Telephone | Canal | Check-in | Remarque |
|---|-------|--------|---------|----------|-----|-----------|-------|----------|----------|
| 32 | 08:51 | A-014 | Retrait | Normale | Adel Turki | +216 25 200 300 | SMS | Kiosk | |
| 33 | 08:53 | B-007 | Releves | Normale | Salma Bouzid | +216 28 400 500 | WhatsApp | Mobile | |
| 34 | 08:55 | C-006 | Depot | Normale | Nizar Belkhodja | +216 51 600 700 | SMS | Kiosk | |
| 35 | 08:57 | D-004 | Prets | Normale | Rachid Ammar | +216 96 800 900 | SMS | Kiosk | |
| 36 | 08:59 | A-015 | Retrait | Normale | Houda Saidi | +216 23 100 100 | SMS | Kiosk | Dernier ticket de la simulation |

---

## Repartition par Service

| Service | Prefixe | Nombre | % | Temps moy. | Couleur |
|---------|---------|--------|---|------------|---------|
| Retrait d'especes | A | 15 | 42% | 5 min | Rouge #E9041E |
| Releves de compte | B | 7 | 19% | 7 min | Noir #1A1A1A |
| Depot d'especes | C | 6 | 17% | 20 min | Rose #D66874 |
| Prets | D | 4 | 11% | 30 min | Bleu #3B82F6 |
| Change de devises | E | 4 | 11% | 10 min | Vert #059669 |
| **Total** | | **36** | **100%** | | |

---

## Repartition par Canal de Notification

| Canal | Nombre | % |
|-------|--------|---|
| SMS | 22 | 61% |
| WhatsApp | 10 | 28% |
| Aucun | 1 | 3% |
| *Total avec telephone* | *35* | *97%* |

---

## Repartition par Methode de Check-in

| Methode | Nombre | % |
|---------|--------|---|
| Kiosk (borne) | 27 | 75% |
| Mobile | 7 | 19% |
| Manuel (BM) | 1 | 3% |
| *Via borne uniquement* | 1 | *3%* |

---

## Evenements Speciaux dans la Simulation

| Heure | Evenement | Ticket | Description |
|-------|-----------|--------|-------------|
| 08:16 | **Entree VIP** | D-001 | Youssef Mansouri entre en VIP par le BM |
| 08:25 | **No-Show** | E-001 | Slim Bouazizi appele mais absent — marque non-presente |
| 08:35 | **Transfert** | E-002 | Fatma Cherif transferee de Change vers Releves -> B-008 |
| 08:38 | **Ouverture G3** | — | IA recommande d'ouvrir le Guichet 3 (pic detecte) |
| 08:40 | **Pause G2** | — | Leila Hamdi part en pause priere (15 min) |
| 08:42 | **Bump priorite** | A-005 | Rania Mejri priorisee (attente > 18 min) |
| 08:45 | **Annonce** | — | "Un nouveau guichet est ouvert pour vous servir plus rapidement" |
| 08:48 | **Bump VIP** | D-003 | Hassan Dridi bumpe en VIP par le BM |
| 08:55 | **Fin pause G2** | — | Leila Hamdi de retour |

---

## Etat du Systeme aux Intervalles de 15 Minutes

### A 08:15 (T+15 min)

| Metrique | Valeur |
|----------|--------|
| Tickets crees | 6 |
| En attente | 3 |
| En service | 2 (G1: A-002, G2: B-001) |
| Completes | 1 (A-001) |
| Guichets actifs | 2/3 |
| Temps attente moy. | 4 min |
| SLA | 100% |

### A 08:30 (T+30 min)

| Metrique | Valeur |
|----------|--------|
| Tickets crees | 15 |
| En attente | 8 |
| En service | 2 (G1: A-005, G2: C-001) |
| Completes | 4 |
| No-show | 1 (E-001) |
| Guichets actifs | 2/3 |
| Temps attente moy. | 11 min |
| SLA | 85% |

### A 08:45 (T+45 min)

| Metrique | Valeur |
|----------|--------|
| Tickets crees | 29 |
| En attente | 10 |
| En service | 3 (G1: A-010, G2: pause, G3: D-001) |
| Completes | 14 |
| No-show | 1 |
| Transferts | 1 |
| Guichets actifs | 2/3 (G2 en pause) |
| Temps attente moy. | 14 min |
| SLA | 72% |

### A 09:00 (T+60 min)

| Metrique | Valeur |
|----------|--------|
| Tickets crees | 36 |
| En attente | 5 |
| En service | 3 (G1, G2, G3 tous actifs) |
| Completes | 26 |
| No-show | 1 |
| Transferts | 1 |
| Guichets actifs | 3/3 |
| Temps attente moy. | 9 min |
| SLA | 88% |
| Score sante | 82/100 (Bon) |

---

## Graphique de Charge (Texte)

```
Clients en attente
12 |
10 |              *****
 8 |         ****      ****
 6 |      ***              ***
 4 |   ***                    ***
 2 | **                          **
 0 |________________________________
   08:00  08:15  08:30  08:45  09:00
```

Le pic de charge (10-11 clients en attente) se situe entre 08:35 et 08:45, declenchant l'ouverture du Guichet 3 et la priorisation des tickets en souffrance.
