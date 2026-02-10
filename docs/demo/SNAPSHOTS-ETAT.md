# Instantanes d'Etat — 6 Moments Cles de la Demo

> Chaque instantane decrit l'etat exact du systeme a un moment critique.
> Utilisez-les pour accompagner les maquettes HTML et le script de demo.

---

## Snapshot 1 : "Ouverture" — T+00:00

> *Debut de la demo. L'agence vient d'ouvrir. Tout est vierge.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours |
|---------|--------|------------|-----------------|
| G1 "Guichet Rapide" | Ouvert | Mohamed Sassi | — |
| G2 | Ouvert | Leila Hamdi | — |
| G3 "Comptes & Prets" | Ferme | — | — |

### File d'attente
*Vide — aucun ticket*

### Statistiques
| Metrique | Valeur |
|----------|--------|
| En attente | 0 |
| En service | 0 |
| Completes | 0 |
| Temps attente moy. | — |
| SLA | 100% |
| Score sante | 95/100 |

### Ce qu'on voit a l'ecran

**TV Display :**
- Section hero : "En attente d'appels" avec icone sablier
- Section file : "Aucun client en attente" avec icone sablier
- Horloge en haut a droite, logo UIB en haut a gauche

**Ecran Guichetier (G1) :**
- Panneau gauche : "Aucun ticket en cours" avec icone sablier
- Panneau droit : "File vide" — bouton "Appeler" desactive (gris)
- Barre de file en bas : vide

**Dashboard BM :**
- Jauge sante : 95/100 (vert) — "Excellent"
- KPIs : tout a zero
- Grille guichets : G1 vert, G2 vert, G3 gris
- File d'attente : vide
- Recommandations : aucune

---

## Snapshot 2 : "Premiers Clients" — T+05:00

> *5 clients sont arrives. Le flux commence. Amira est en train d'etre servie.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours | Service | Timer |
|---------|--------|------------|-----------------|---------|-------|
| G1 | Servant | Mohamed Sassi | **A-001** (Amira) | Retrait | 02:45 |
| G2 | Servant | Leila Hamdi | **B-001** (Mehdi) | Releves | 01:30 |
| G3 | Ferme | — | — | — | — |

### File d'attente
| Position | Ticket | Service | Client | Attente | Priorite |
|----------|--------|---------|--------|---------|----------|
| 1 | A-002 | Retrait | Sonia Mrad | 3 min | Normale |
| 2 | C-001 | Depot | Karim Gharbi | 2 min | Normale |
| 3 | A-003 | Retrait | Imen Bouslama | 1 min | Normale |

### Statistiques
| Metrique | Valeur |
|----------|--------|
| En attente | 3 |
| En service | 2 |
| Completes | 0 |
| Temps attente moy. | 2 min |
| SLA | 100% |
| Score sante | 88/100 |

### Ce qu'on voit a l'ecran

**TV Display :**
- Hero : 2 cartes "Guichet 1 — A-001" (rouge Retrait) et "Guichet 2 — B-001" (noir Releves)
- File : 3 tickets affiches (A-002, C-001, A-003) avec position, service, temps estime
- Les couleurs distinguent clairement les services

**Ecran Guichetier (G1) :**
- Panneau gauche : A-001, "Retrait d'especes", timer 02:45, boutons Terminer / Non-presente
- Panneau droit : A-002, "Retrait d'especes" — prochain a appeler (mais bouton desactive car ticket en cours)
- Barre en bas : "A-002 > C-001 > A-003" avec points colores

**Dashboard BM :**
- Jauge : 88/100 (vert)
- KPIs : 3 en attente, ~2 min attente, 100% SLA, 2/3 guichets
- Grille : G1 vert (A-001), G2 vert (B-001), G3 gris
- Recommandation possible : aucune (charge faible)

---

## Snapshot 3 : "Operation Complete" — T+10:00

> *10 minutes. File bien remplie, le VIP est arrive, premier no-show detecte.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours | Service | Timer |
|---------|--------|------------|-----------------|---------|-------|
| G1 | Servant | Mohamed Sassi | **A-004** (Hichem) | Retrait | 01:20 |
| G2 | Servant | Leila Hamdi | **D-001** (Youssef VIP) | Prets | 03:00 |
| G3 | Ferme | — | — | — | — |

### File d'attente
| Position | Ticket | Service | Client | Attente | Priorite |
|----------|--------|---------|--------|---------|----------|
| 1 | A-005 | Retrait | Rania Mejri | 6 min | Normale |
| 2 | C-002 | Depot | Walid Belhaj | 5 min | Normale |
| 3 | E-002 | Change | Fatma Cherif | 4 min | Normale |
| 4 | A-006 | Retrait | Sami Tlili | 3 min | Normale |
| 5 | B-003 | Releves | Olfa Chaabane | 2 min | Normale |
| 6 | A-007 | Retrait | Ramzi Kammoun | 1 min | Normale |

### Statistiques
| Metrique | Valeur |
|----------|--------|
| En attente | 6 |
| En service | 2 |
| Completes | 5 (A-001, B-001, A-002, C-001, A-003) |
| No-show | 1 (E-001 — Slim) |
| Temps attente moy. | 7 min |
| SLA | 92% |
| Score sante | 78/100 |

### Ce qu'on voit a l'ecran

**TV Display :**
- Hero : G1 sert A-004 (rouge), G2 sert D-001 (bleu, badge VIP dore)
- File : 6 tickets en attente, couleurs variees (rouge, rose, vert, noir)
- Queue commence a etre chargee

**Dashboard BM :**
- Jauge : 78/100 (vert, proche de l'ambre)
- KPIs : 6 en attente, ~7 min, 92% SLA, 2/3 guichets
- Barre services : dominance Retrait (rouge)
- **Alerte potentielle** : "Charge en augmentation"

---

## Snapshot 4 : "Pic de Stress" — T+20:00

> *Le pic est atteint. SLA a risque. L'IA recommande d'ouvrir G3. C'est le debut de l'Acte 2.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours | Service | Timer |
|---------|--------|------------|-----------------|---------|-------|
| G1 | Servant | Mohamed Sassi | **A-008** (Amel) | Retrait | 02:10 |
| G2 | Servant | Leila Hamdi | **D-001** (Youssef VIP) | Prets | 18:00 |
| G3 | **Ferme** | — | — | — | — |

### File d'attente
| Position | Ticket | Service | Client | Attente | Priorite | Statut SLA |
|----------|--------|---------|--------|---------|----------|------------|
| 1 | A-005 | Retrait | **Rania Mejri** | **18 min** | Normale | **A RISQUE** |
| 2 | C-002 | Depot | Walid Belhaj | 16 min | Normale | **A RISQUE** |
| 3 | B-003 | Releves | Olfa Chaabane | 14 min | Normale | Attention |
| 4 | A-007 | Retrait | Ramzi Kammoun | 12 min | Normale | Attention |
| 5 | D-002 | Prets | Mounir Gasmi | 10 min | Normale | Normal |
| 6 | C-003 | Depot | Ridha Oueslati | 9 min | Normale | Normal |
| 7 | B-004 | Releves | Leila Ayari | 8 min | Normale | Normal |
| 8 | A-009 | Retrait | Tarek Jaziri | 7 min | Normale | Normal |
| 9 | E-003 | Change | Mourad Sahli | 6 min | Normale | Normal |
| 10 | A-010 | Retrait | Khaled Benayed | 5 min | Normale | Normal |

### Statistiques
| Metrique | Valeur |
|----------|--------|
| En attente | **10** |
| En service | 2 |
| Completes | 10 |
| No-show | 1 |
| Transferts | 1 (E-002 -> B-008) |
| Temps attente moy. | **13 min** |
| SLA | **72%** |
| Score sante | **58/100** |

### Ce qu'on voit a l'ecran

**TV Display :**
- Hero : G1 sert A-008, G2 sert D-001 (VIP, longue duree)
- File : 8 tickets affiches (max) + "+2 de plus"
- Les premiers tickets ont des temps d'attente longs

**Dashboard BM :**
- Jauge : **58/100 (AMBRE)** — "Attention"
- KPIs :
  - En attente : **10** (barre rouge)
  - Attente moy. : **13 min** (barre ambre)
  - Capacite : 67% (2/3)
  - SLA : **72%** avec fleche descendante
  - Servis : 10/120 cible
- Grille guichets : G1 vert, G2 vert (D-001 en cours depuis 18 min), **G3 gris**
- Sparklines : pic prevu maintenant, decrue dans 1h
- **Table file :** A-005 et C-002 en ROUGE (SLA depasse)
- **Bandeau alerte :** "2 alertes : 2 clients attendent depuis >15 min"
- **Recommandations IA :**
  1. **"Ouvrir Guichet 3"** — urgence critique, bouton Executer
  2. "Prioriser A-005 (18 min d'attente)" — urgence haute

---

## Snapshot 5 : "Apres Actions IA" — T+25:00

> *Le BM a execute les recommandations : G3 ouvert, Rania priorisee, pause prise et terminee.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours | Service | Timer |
|---------|--------|------------|-----------------|---------|-------|
| G1 | Servant | Mohamed Sassi | **A-009** (Tarek) | Retrait | 01:30 |
| G2 | Servant | Leila Hamdi | **C-003** (Ridha) | Depot | 04:00 |
| G3 | **Servant** | **Ali Rezgui** | **B-004** (Leila A.) | Releves | 02:00 |

### File d'attente
| Position | Ticket | Service | Client | Attente | Priorite |
|----------|--------|---------|--------|---------|----------|
| 1 | E-003 | Change | Mourad Sahli | 8 min | Normale |
| 2 | A-010 | Retrait | Khaled Benayed | 7 min | Normale |
| 3 | C-004 | Depot | Ines Hammami | 5 min | Normale |
| 4 | A-011 | Retrait | Habib Mejri | 3 min | Normale |
| 5 | B-005 | Releves | Asma Laabidi | 2 min | Normale |

### Statistiques
| Metrique | Valeur |
|----------|--------|
| En attente | **5** (baisse de 10 a 5) |
| En service | **3** |
| Completes | 18 |
| No-show | 1 |
| Transferts | 1 |
| Bumps priorite | 2 (Rania + Hassan) |
| Temps attente moy. | **8 min** (baisse de 13) |
| SLA | **85%** (remontee de 72%) |
| Score sante | **79/100** (remontee de 58) |

### Ce qu'on voit a l'ecran

**TV Display :**
- Hero : **3 cartes actives** — G1, G2, G3 tous en service
- File : 5 tickets seulement — file bien plus courte
- Temps d'attente affiches plus raisonnables

**Dashboard BM :**
- Jauge : **79/100 (VERT)** — "Bon" (remontee depuis ambre)
- KPIs :
  - En attente : **5** (barre verte)
  - Attente moy. : **8 min** (barre verte)
  - Capacite : **100%** (3/3)
  - SLA : **85%** avec fleche montante
- Grille guichets : **G1 vert, G2 vert, G3 vert** — tous actifs
- Plus d'alertes SLA dans la table
- **Recommandations :** "Bonne gestion, maintenir le rythme" (basse priorite)
- L'amelioration est visible et mesurable

---

## Snapshot 6 : "Fin de Demo" — T+30:00

> *Conclusion. L'agence fonctionne bien. Tous les KPIs sont au vert.*

### Guichets
| Guichet | Statut | Guichetier | Ticket en cours | Service | Timer |
|---------|--------|------------|-----------------|---------|-------|
| G1 | Servant | Mohamed Sassi | A-014 (Adel) | Retrait | 01:15 |
| G2 | Servant | Leila Hamdi | C-006 (Nizar) | Depot | 03:00 |
| G3 | Servant | Ali Rezgui | D-004 (Rachid) | Prets | 05:00 |

### File d'attente
| Position | Ticket | Service | Client | Attente | Priorite |
|----------|--------|---------|--------|---------|----------|
| 1 | A-015 | Retrait | Houda Saidi | 2 min | Normale |
| 2 | B-007 | Releves | Salma Bouzid | 3 min | Normale |

### Statistiques Finales
| Metrique | Valeur |
|----------|--------|
| En attente | **2** |
| En service | 3 |
| **Completes** | **28** |
| No-show | 1 |
| Transferts | 1 |
| Bumps priorite | 2 |
| Temps attente moy. | **7 min** |
| SLA | **88%** |
| Score sante | **85/100** |

### Ce qu'on voit a l'ecran

**TV Display :**
- Hero : 3 guichets actifs, tous en service
- File : seulement 2 tickets — temps d'attente court
- Ambiance calme et maitrisee

**Dashboard BM :**
- Jauge : **85/100 (VERT)** — "Excellent"
- Tous les KPIs au vert
- File quasi vide
- Aucune alerte
- Performance du jour : 28/120 (23%) a 09:00 — en avance sur l'objectif

**Dashboard HQ (pour l'Acte 3) :**
- Jauge reseau : **78/100** — "Bon"
- 5 agences avec performances variees
- Agence Lac 2 en vert (85), Menzah en rouge (42)
- 46 en attente reseau, 87% SLA global
- Recommandation : "Renforcer Agence Menzah 6"

---

## Resume de l'Evolution

```
Score Sante :  95 → 88 → 78 → 58 → 79 → 85
               ↑      ↑      ↑      ↑      ↑      ↑
            Ouvert  Debut  Rush   Pic   Actions  Fin
                                  ↓
                           IA recommande
                           d'ouvrir G3
```

| Snapshot | Score | En attente | SLA | Guichets | Moment cle |
|----------|-------|-----------|-----|----------|------------|
| 1. Ouverture | 95 | 0 | 100% | 2/3 | Demarrage propre |
| 2. Premiers clients | 88 | 3 | 100% | 2/3 | Flux etabli |
| 3. Operation | 78 | 6 | 92% | 2/3 | VIP + no-show |
| 4. Pic stress | **58** | **10** | **72%** | 2/3 | SLA a risque |
| 5. Apres actions | 79 | 5 | 85% | **3/3** | Amelioration |
| 6. Fin demo | **85** | 2 | 88% | 3/3 | Succes |
