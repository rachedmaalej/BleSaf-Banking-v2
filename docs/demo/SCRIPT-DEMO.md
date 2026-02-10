# Script de Demo — BléSaf (30 minutes)

> **Format :** Walkthrough guide avec supports visuels HTML
> **Langue :** Francais
> **Duree :** 30 minutes (3 actes de 10 min)
> **Supports :** 3 pages HTML dans `docs/demo/visuals/`

---

## Checklist Pre-Demo

### 1 heure avant

- [ ] Lancer `pnpm db:seed-demo` pour charger les 5 agences
- [ ] Lancer `pnpm dev` et verifier que l'app tourne (localhost:5173 + :3001)
- [ ] Ouvrir les 3 fichiers HTML dans des onglets du navigateur :
  - `docs/demo/visuals/snapshots-visuels.html` — Maquettes des 6 etats
  - `docs/demo/visuals/flux-clients.html` — Timeline des 36 clients
  - `docs/demo/visuals/tableau-agences.html` — Matrice HQ des 5 agences
- [ ] Tester la navigation entre snapshots (fleches clavier)
- [ ] Preparer l'ecran : navigateur en plein ecran, onglets organises
- [ ] Avoir ce script ouvert sur un second ecran ou imprime
- [ ] Verifier le son du laptop (pour mentionner le carillon)

### Arrangement des onglets

```
Onglet 1: snapshots-visuels.html  (Actes 1 & 2)
Onglet 2: tableau-agences.html    (Acte 3)
Onglet 3: flux-clients.html       (Reference, montrer si questions)
Onglet 4: App live (backup)        (localhost:5173)
```

---

## Introduction (avant le chrono — 2 min)

### Slide de contexte

> **Presentateur :**
>
> *"Bonjour a tous. Aujourd'hui, je vais vous presenter BléSaf — notre solution de gestion des files d'attente pour les agences bancaires.*
>
> *Le probleme est simple : aujourd'hui, vos clients attendent entre 30 et 60 minutes en agence, sans aucune visibilite sur leur temps d'attente. Les directeurs d'agence n'ont aucun outil pour piloter l'affluence en temps reel. Et la direction du reseau n'a aucune vue consolidee de la performance de ses agences.*
>
> *BléSaf resout ces 3 problemes avec une seule plateforme. Je vais vous montrer comment, en 3 etapes :*
> - *Premierement, le parcours client — ce que voient vos clients*
> - *Deuxiemement, le tableau de bord du directeur d'agence — comment il pilote*
> - *Troisiemement, le centre de commande reseau — votre vision 360*
>
> *Commençons."*

---

## ACTE 1 — Le Parcours Client (0:00 - 10:00)

> **Support visuel :** `snapshots-visuels.html` — commencer au Snapshot 1

---

### 0:00 — L'agence ouvre (Snapshot 1)

**Afficher :** Snapshot 1 "Ouverture"

**Montrer :** Le panneau TV Display (gauche) — ecran vide "En attente d'appels"

> *"Voici l'Agence Lac 2 qui vient d'ouvrir. L'ecran TV dans la salle d'attente affiche un message simple : en attente d'appels. Deux guichets sont ouverts — Mohamed au Guichet 1, Leila au Guichet 2. Le Guichet 3 est ferme pour le moment."*

**Montrer :** Le panneau Dashboard (droite) — score 95, tout au vert

> *"Le directeur d'agence voit un score de sante de 95 sur 100 — tout est au vert. Voyons ce qui se passe quand les premiers clients arrivent."*

**Duree :** 1 minute

---

### 1:00 — Amira prend un ticket (transition vers Snapshot 2)

**Action :** Decrire le parcours kiosk (ne pas changer de snapshot encore)

> *"Notre premiere cliente arrive : Amira, 28 ans, enseignante. Elle s'approche de la borne tactile a l'entree de l'agence."*

**Decrire le kiosk :**

> *"L'ecran de la borne est simple : 5 services affiches avec des icones et des couleurs distinctes. Retrait en rouge, Depot en rose, Releves en noir, Prets en bleu, Change en vert. Amira touche 'Retrait d'especes'.*
>
> *L'ecran suivant lui propose de saisir son numero de telephone pour recevoir un SMS quand ce sera son tour. Elle entre son +216 22 456 789 et appuie sur 'Obtenir un ticket'.*
>
> *En moins de 3 secondes, son ticket s'affiche : A-001, position numero 1, temps d'attente estime environ 5 minutes. Un QR code lui permet de suivre sa position depuis son telephone. Tout cela en 10 secondes."*

**Duree :** 1 min 30

---

### 2:30 — La file se remplit (Snapshot 2)

**Action :** Passer au Snapshot 2 "Premiers Clients"

**Montrer :** Le panneau TV Display

> *"5 minutes plus tard, regardez l'ecran TV. Deux clients sont en service — A-001 au Guichet 1, B-001 au Guichet 2. Et 3 clients attendent dans la file, avec chacun leur position et leur temps d'attente estime."*

**Pointer les couleurs :**

> *"Remarquez les couleurs : chaque service a sa propre identite visuelle. Le rouge pour le Retrait, le rose pour le Depot. Les clients identifient immediatement leur type de service dans la file."*

### ★ WOW #1 — Mise a jour temps reel

> *"Ce qui est impressionnant, c'est que tout cela se met a jour en temps reel. Des qu'un ticket est cree a la borne, il apparait instantanement sur l'ecran TV, sur le tableau de bord du directeur, et sur l'ecran du guichetier. Pas de rafraichissement, pas de delai."*

**Duree :** 1 min 30

---

### 4:00 — Le guichetier appelle (Snapshot 2 suite)

**Montrer :** Le panneau Teller (centre)

> *"Regardons ce que voit Mohamed au Guichet 1. Son ecran est minimaliste : a gauche, le ticket en cours — A-001, Retrait, avec un chronometre qui tourne depuis 2 minutes 45. A droite, le prochain client — A-002, pret a etre appele."*

**Montrer :** Les boutons d'action

> *"Mohamed a exactement 2 boutons : 'Terminer' quand le service est fini, et 'Non-presente' si le client ne se presente pas. En bas, la file d'attente avec les clients suivants."*

### ★ WOW #2 — Carillon sonore et animation

> *"Quand Mohamed clique 'Appeler', trois choses se passent simultanement :*
> - *L'ecran TV affiche 'Guichet 1 — A-001' en grand dans la zone hero*
> - *Un carillon sonore retentit dans l'agence*
> - *Un badge 'NOUVEAU' clignote pendant 10 secondes*
>
> *Impossible de rater son tour."*

**Duree :** 2 minutes

---

### 6:00 — Le VIP et le No-Show (Snapshot 3)

**Action :** Passer au Snapshot 3 "Operation Complete"

**Montrer :** Le panneau TV Display — 2 guichets actifs, badge VIP dore

> *"10 minutes apres l'ouverture. Regardez le Guichet 2 : D-001, avec un badge dore. C'est le General Mansouri, un client VIP. Le directeur l'a ajoute manuellement depuis son tableau de bord avec le statut prioritaire. Le badge dore est visible par tous sur l'ecran TV."*

> *"Et dans la file, 6 clients attendent. Vous voyez aussi que le ticket E-001 a disparu — c'etait Slim, un etudiant qui est sorti fumer et n'est pas revenu quand il a ete appele. Le guichetier a clique 'Non-presente' et le systeme est passe immediatement au suivant."*

### ★ WOW #3 — Annonces en direct

> *"Le directeur d'agence peut aussi envoyer des annonces directement sur l'ecran TV. Regardez : une banniere noire glisse depuis la droite avec un compte a rebours. Le message peut etre lu a voix haute par synthese vocale, en français ou en arabe."*

**Duree :** 2 minutes

---

### 8:00 — Bilingue et suivi mobile

**Rester sur le Snapshot 3 — decrire des fonctionnalites supplementaires**

> *"Deux fonctionnalites supplementaires importantes :*
>
> *Premierement, l'interface est entierement bilingue. Un bouton sur la borne permet de basculer instantanement entre le français et l'arabe — avec support complet du RTL, l'ecriture de droite a gauche."*

> *"Deuxiemement, le QR code sur le ticket. Le client le scanne et accede a une page de suivi sur son telephone. Il voit en temps reel sa position dans la file, le temps estime restant, et il recoit un SMS quand c'est presque son tour. Il peut meme attendre dans sa voiture."*

**Duree :** 1 min 30

---

### 9:30 — Transition vers l'Acte 2

> *"Voila pour le parcours client. En resume :*
> - *La borne kiosk : ticket en 10 secondes, choix du service, QR code*
> - *L'ecran TV : file d'attente en temps reel, appels sonores, annonces*
> - *Le guichetier : interface simple, 2 boutons, chronometre automatique*
> - *Le client : suivi mobile, notifications SMS/WhatsApp*
>
> *Maintenant, voyons ce que voit le directeur d'agence — et comment l'intelligence artificielle l'aide a prendre de meilleures decisions."*

---

## ACTE 2 — L'Intelligence de l'Agence (10:00 - 20:00)

> **Support visuel :** `snapshots-visuels.html` — Snapshot 4, puis 5

---

### 10:00 — Le pic de stress (Snapshot 4)

**Action :** Passer au Snapshot 4 "Pic de Stress"

**Montrer :** Le panneau Dashboard (droite) — vue d'ensemble

> *"Nous sommes maintenant 20 minutes apres l'ouverture, en pleine heure de pointe. Regardons le tableau de bord du directeur d'agence. Tout est visible d'un seul coup d'oeil, organise en 4 niveaux."*

### ★ WOW #4 — Score de Sante IA

**Pointer :** La jauge dans le dashboard

> *"Le premier element qui attire l'oeil : le Score de Sante. C'est un indice composite calcule par notre moteur d'intelligence artificielle, de 0 a 100. Il combine la longueur de la file, les temps d'attente, le taux de service, et l'utilisation des guichets.*
>
> *En ce moment, le score est a 58 — en zone ambre, 'Attention'. Le directeur voit immediatement que quelque chose ne va pas."*

**Duree :** 1 min 30

---

### 11:30 — Les KPIs en detail

**Pointer :** Les indicateurs du dashboard dans le Snapshot 4

> *"Les indicateurs cles confirment le probleme :*
> - *10 clients en attente — la barre est rouge*
> - *Temps d'attente moyen : 13 minutes — en ambre, proche du SLA de 15 minutes*
> - *Capacite : seulement 67% — 2 guichets sur 3 sont ouverts*
> - *SLA : 72% avec une fleche descendante — en deterioration*
>
> *Et dans la grille des guichets : G1 vert, G2 vert, mais G3 est gris — ferme. C'est clairement le probleme."*

### ★ WOW #5 — Prevision IA

> *"Le systeme ne se contente pas de montrer le present. Les barres de prevision montrent que le pic est prevu exactement maintenant, avec une decrue dans l'heure qui vient. Le directeur peut anticiper."*

**Duree :** 1 min 30

---

### 13:00 — La file SLA en danger

**Pointer :** La table de file d'attente dans le dashboard

> *"Dans la table de la file d'attente, deux tickets sont en rouge : A-005 (Rania, 18 minutes d'attente) et C-002 (Walid, 16 minutes). Ils ont depasse le SLA de 15 minutes. Le bandeau d'alerte affiche : '2 alertes : 2 clients attendent depuis plus de 15 minutes'."*

**Duree :** 1 minute

---

### 14:00 — La recommandation IA (le moment cle)

### ★ WOW #6 — Recommandation actionable

**Pointer :** Le chip de recommandation dans le dashboard

> *"Et voici le coeur du systeme : la recommandation IA. Le moteur a analyse la situation et recommande : 'Ouvrir Guichet 3'. Il explique pourquoi — la file est trop longue pour 2 guichets — et estime l'impact : 'Reduit l'attente de 30%'.*
>
> *Un seul bouton : 'Executer'. Le directeur clique, et le Guichet 3 s'ouvre immediatement. Pas de configuration, pas d'appel telephonique, pas de formulaire."*

**Duree :** 1 min 30

---

### 15:30 — Les effets des actions (Snapshot 5)

**Action :** Passer au Snapshot 5 "Apres Actions IA"

**Montrer :** Comparaison immediate avec le Snapshot 4

> *"5 minutes plus tard, regardez la transformation :*
> - *Le score est remonte de 58 a 79 — retour en zone verte*
> - *Les clients en attente passent de 10 a 5*
> - *Le temps moyen passe de 13 a 8 minutes*
> - *Le SLA remonte de 72% a 85%, fleche montante*
> - *Et surtout : les 3 guichets sont maintenant au vert"*

> *"L'ecran TV confirme : 3 cartes 'En service' dans la zone hero. La file est visiblement plus courte."*

**Duree :** 1 min 30

---

### 17:00 — Gestion des pauses et priorites

**Rester sur le Snapshot 5 — decrire des scenarios supplementaires**

> *"Le directeur peut aussi :*
>
> *Gerer les pauses : quand un guichetier doit faire sa priere, le directeur ouvre une fenetre de pause avec la raison et la duree. Le guichet passe en ambre sur le tableau de bord, avec un compteur de temps restant. Si la pause depasse, l'IA recommande de rappeler le guichetier."*

### ★ WOW #7 — Priorisation en un clic

> *"Et pour la priorisation : quand le directeur voit qu'un client attend trop longtemps, il clique 'Prioriser'. Le ticket passe immediatement en tete de file avec une icone etoile. Sur l'ecran TV, le client voit qu'il est maintenant le prochain. Tout cela sans perturber les autres clients."*

**Duree :** 1 min 30

---

### 18:30 — Fonctionnalites supplementaires

> *"Quelques fonctionnalites supplementaires du tableau de bord :*
> - *Pause de la file d'attente : un bouton bloque temporairement les bornes kiosk — les clients voient un message 'Service temporairement indisponible'*
> - *Annonces urgentes : le directeur peut diffuser un message directement sur l'ecran TV*
> - *Confirmation de securite : les actions destructives comme la fermeture de la file necessitent un double-clic de confirmation"*

**Duree :** 1 minute

---

### 19:30 — Transition vers l'Acte 3

> *"Le directeur d'agence a maintenant tout ce dont il a besoin :*
> - *Un score de sante IA pour evaluer sa situation en un coup d'oeil*
> - *Des previsions pour anticiper les pics*
> - *Des recommandations actionnables en un clic*
> - *Des outils de gestion : pauses, priorites, annonces*
>
> *Maintenant, imaginons que vous etes le directeur general de la banque. Vous gerez 5 agences. Comment avez-vous une vue d'ensemble ?"*

---

## ACTE 3 — Le Centre de Commande Reseau (20:00 - 30:00)

> **Support visuel :** `tableau-agences.html`

---

### 20:00 — La vue reseau

**Action :** Basculer vers l'onglet `tableau-agences.html`

> *"Bienvenue dans le Centre de Commande Reseau. Cette vue est reservee a la direction de la banque — le Bank Admin. D'un seul ecran, vous supervisez les 5 agences du reseau UIB."*

### ★ WOW #8 — Score de Sante Reseau

**Montrer :** La jauge reseau en haut a gauche

> *"Le Score de Sante Reseau : 78 sur 100, 'Bon'. C'est la moyenne ponderee de toutes vos agences. Un seul chiffre pour savoir si votre reseau va bien."*

**Duree :** 1 minute

---

### 21:00 — Les KPIs consolides

**Montrer :** Les 5 cartes KPI a droite de la jauge

> *"Les metriques consolidees de tout le reseau :*
> - *46 clients en attente sur l'ensemble des 5 agences*
> - *87% de SLA moyen — au-dessus de l'objectif de 85%*
> - *156 clients deja servis ce matin*
> - *72% des guichets actifs — 12 sur 17*
> - *Et une alerte rouge : 1 agence critique"*

**Duree :** 1 minute

---

### 22:00 — La matrice de performance

**Montrer :** Le tableau des 5 agences

> *"Le coeur de cette vue : la matrice de performance. Chaque agence est comparee sur 7 metriques. Les colonnes sont triables — un clic pour trier par score de sante, un autre pour trier par temps d'attente."*

**Pointer les lignes :**

> *"Regardez les couleurs :*
> - *Agence Sousse : point vert, score 88, SLA 95% — exemplaire*
> - *Agence Lac 2 : point vert, score 85, bien geree*
> - *Agence Ariana : point jaune, score 71 — sous surveillance*
> - *Agence Sfax : point jaune, score 55 — attention requise*
> - *Agence Menzah : point rouge, score 42 — critique"*

### ★ WOW #9 — Filtrage instantane

**Action :** Cliquer sur le filtre "Critique"

> *"En cliquant 'Critique', seule l'agence Menzah apparait. 18 clients en attente, 24 minutes d'attente moyenne, SLA a 61%. Le probleme est clair : seulement 2 guichets sur 4 sont ouverts."*

**Action :** Cliquer sur une ligne pour la developper

> *"En cliquant la ligne, on voit le detail : 5 no-shows aujourd'hui, 3 guichets fermes, et le SLA est sous les 65%. Les causes du probleme sont identifiees."*

**Duree :** 2 minutes

---

### 24:00 — Tri et analyse

**Action :** Revenir au filtre "Tous", trier par "Attente Moy." descendant

> *"Trions par temps d'attente moyen. Menzah en tete avec 24 minutes — c'est la que les clients souffrent le plus. Sfax suit avec 16 minutes. Les 3 autres sont sous les 12 minutes."*

**Duree :** 1 minute

---

### 25:00 — Le classement

### ★ WOW #10 — Classement instantane

**Montrer :** La section classement (sous le tableau)

> *"Le classement des agences : Sousse en or avec 34 clients servis, Lac 2 en argent avec 28, Ariana en bronze avec 22. En bas : Sfax et Menzah, avec des badges rouges.*
>
> *Ce classement se met a jour en temps reel. C'est un outil puissant de motivation et de responsabilisation pour vos directeurs d'agence."*

**Duree :** 1 minute

---

### 26:00 — Les tendances

**Montrer :** Les 4 mini-graphiques de tendance

> *"Les tendances sur 7 jours montrent une evolution positive :*
> - *Le nombre de clients servis augmente*
> - *Le temps d'attente moyen diminue*
> - *Le SLA s'ameliore progressivement*
> - *Les no-shows diminuent*
>
> *C'est la preuve que la plateforme ameliore la performance semaine apres semaine."*

**Duree :** 1 minute

---

### 27:00 — Recommandations reseau

**Montrer :** Les 3 chips de recommandation en bas

> *"Les recommandations au niveau du reseau :*
> - *En rouge, urgence critique : 'Renforcer Agence Menzah 6' — 2 guichets supplementaires necessaires*
> - *En ambre : 'Ouvrir un guichet a Sfax' — le temps d'attente depasse le SLA*
> - *En vert : 'Feliciter Agence Sousse' — performance exemplaire*
>
> *L'IA ne se contente pas de signaler les problemes — elle felicite aussi les reussites."*

**Duree :** 1 minute

---

### 28:00 — Administration

> *"Au-dela du monitoring, la plateforme offre une administration complete :*
> - *Gestion des utilisateurs : creer des comptes, assigner des roles*
> - *Configuration des agences : horaires, services, guichets*
> - *Templates de services : definir une fois, deployer partout*
>
> *Tout est multi-tenant : chaque banque a son espace isole, ses utilisateurs, ses donnees."*

**Duree :** 1 minute

---

### 29:00 — Recapitulatif final

**Action :** Revenir sur le Snapshot 6 "Fin de Demo" dans `snapshots-visuels.html` (optionnel)

> *"En resume, BléSaf couvre 3 niveaux :*
>
> **Niveau 1 — Le Client**
> *Borne tactile, ticket en 10 secondes, suivi mobile, notifications SMS/WhatsApp, ecran TV temps reel.*
>
> **Niveau 2 — Le Directeur d'Agence**
> *Score de sante IA, previsions de charge, recommandations actionnables, gestion des pauses et priorites.*
>
> **Niveau 3 — La Direction du Reseau**
> *Vue consolidee, matrice de performance, classement, tendances, recommandations strategiques.*
>
> *Une seule plateforme, du client au directeur general. Et le resultat : des temps d'attente divises par 3, une satisfaction client en hausse, et des outils de pilotage que vos concurrents n'ont pas.*
>
> *Merci. Des questions ?"*

**Duree :** 1 min 30

---

## Checkpoints de Timing

| Temps | Ou vous devez etre |
|-------|-------------------|
| 3:00 | En train de montrer le TV Display avec la file remplie |
| 5:00 | Snapshot 2, en train de montrer le Teller |
| 7:00 | Snapshot 3, VIP et No-Show |
| 10:00 | Transition vers Acte 2, ouvrir Snapshot 4 |
| 14:00 | En train de montrer la recommandation IA |
| 16:00 | Snapshot 5, montrer l'amelioration |
| 20:00 | Basculer vers tableau-agences.html |
| 25:00 | Classement des agences |
| 29:00 | Recapitulatif final |

---

## Plan de Secours

### Si vous etes en retard

**Acte 1 (retard > 2 min) :**
- Sauter le detail du kiosk (1:00-2:30), aller directement au Snapshot 2
- Combiner les WOW #1 et #2 en un seul point

**Acte 2 (retard > 2 min) :**
- Sauter les fonctionnalites supplementaires (18:30)
- Aller directement du Snapshot 5 a la transition

**Acte 3 (retard > 2 min) :**
- Sauter le tri et l'analyse (24:00)
- Combiner tendances et recommandations en un seul point

### Si un support visuel ne fonctionne pas

- Utiliser l'app live (onglet 4) comme backup
- Se connecter avec les identifiants du GUIDE-PRESENTATEUR.md
- Naviguer directement vers les ecrans concernes

### Si on vous pose une question technique

> *"Excellente question. Je note et on pourra en discuter en detail apres la presentation. Pour le moment, laissez-moi vous montrer..."*

---

## Les 10 WOW Moments — Resume

| # | Moment | Acte | Timing | Ce qui impressionne |
|---|--------|------|--------|-------------------|
| 1 | Temps reel | 1 | 2:30 | Ticket cree → visible instantanement partout |
| 2 | Carillon + animation | 1 | 4:00 | Chime sonore + badge NOUVEAU clignotant |
| 3 | Annonce en direct | 1 | 6:00 | Banniere + synthese vocale sur TV |
| 4 | Score de Sante IA | 2 | 10:00 | Un seul chiffre pour evaluer l'agence |
| 5 | Prevision IA | 2 | 11:30 | Anticipation des pics d'affluence |
| 6 | Recommandation actionable | 2 | 14:00 | "Ouvrir G3" → clic → effet immediat |
| 7 | Priorisation en un clic | 2 | 17:00 | Client passe en tete de file |
| 8 | Score Sante Reseau | 3 | 20:00 | 5 agences en un seul chiffre |
| 9 | Filtrage instantane | 3 | 22:00 | Critique → seule Menzah apparait |
| 10 | Classement agences | 3 | 25:00 | Medailles, motivation, accountability |
