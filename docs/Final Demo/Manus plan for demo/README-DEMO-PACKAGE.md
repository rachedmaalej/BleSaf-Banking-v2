# BléSaf Demo Package

> Package complet pour la demonstration de 30 minutes de BléSaf — Systeme de gestion de file d'attente bancaire.

## Contenu du Package

### Fichiers de la Demo Interactive

| Fichier | Description | Ouvrir en |
|---------|-------------|-----------|
| `demo-launcher.html` | **Page de controle** — Timer, liens, aide-memoire | Navigateur |
| `kiosk-mockup.html` | Simulation borne client (parcours complet) | Navigateur |
| `tv-display-mockup.html` | Simulation ecran TV agence (6 snapshots) | Navigateur |
| `teller-mockup.html` | Simulation ecran guichetier (6 snapshots) | Navigateur |
| `bm-dashboard-mockup.html` | Tableau de bord directeur + IA (6 snapshots) | Navigateur |
| `hq-dashboard-mockup.html` | Tableau de bord siege (vue reseau) | Navigateur |
| `demo-data.js` | Donnees partagees (36 clients, 6 snapshots, HQ) | - |

### Documentation

| Fichier | Description |
|---------|-------------|
| `Integrated_Demo_Quick_Reference.md` | Aide-memoire 1 page avec chronologie |
| `BleSaf Banking App - Complete Demo Guide.md` | Guide complet de la demo |
| `BleSaf Banking App - The Complete 30-Minute Demo Script.md` | Script detaille avec dialogues |
| `README-DEMO-PACKAGE.md` | Ce fichier |

### Donnees Source

| Fichier | Description |
|---------|-------------|
| `demo_customers.csv` | 36 clients avec tickets, services, temps |
| `demo_snapshots.csv` | 6 snapshots de l'etat de la file |
| `demo_state_14_15.json` | Etat detaille au moment critique (14:15) |
| `demo_state_14_15_detailed.json` | Etat complet avec 19 clients en attente |
| `simulation_snapshots.csv` | Donnees brutes de simulation |

### Visualisations (PNG)

| Fichier | Description |
|---------|-------------|
| `viz_queue_length.png` | Evolution de la longueur de file |
| `viz_sla_trajectory.png` | Trajectoire SLA |
| `viz_service_breakdown.png` | Repartition par service a 14:15 |
| `viz_counter_utilization.png` | Timeline d'utilisation des guichets |
| `viz_queue_velocity.png` | Velocite de la file |
| `viz_predictive_demand.png` | Prevision de demande |

### Scripts de Simulation (Python)

| Fichier | Description |
|---------|-------------|
| `customer_flow_simulation.py` | Simulation de base du flux clients |
| `enhanced_simulation.py` | Simulation avancee avec evenements |
| `generate_demo_visualizations.py` | Generateur des graphiques PNG |

---

## Comment Utiliser

### Preparation (5 min avant la demo)

1. Ouvrir `demo-launcher.html` dans Chrome/Edge
2. Verifier que les 5 liens de mockup fonctionnent (clic droit > ouvrir dans nouvel onglet)
3. Arranger les onglets: Launcher | Borne | TV | Guichet | BM | HQ
4. Consulter `Integrated_Demo_Quick_Reference.md` pour la chronologie

### Pendant la Demo (30 min)

1. **Lancer le timer** sur la page launcher
2. Suivre la chronologie: Acte 1 (Borne/TV/Guichet) → Acte 2 (BM) → Acte 3 (HQ)
3. Utiliser les **fleches du clavier** (← →) pour naviguer entre les snapshots
4. Les boutons numerotes (1-6) permettent aussi de sauter directement a un snapshot

### Navigation des Mockups

- **Fleche droite (→)** : Snapshot suivant
- **Fleche gauche (←)** : Snapshot precedent
- **Boutons 1-6** : Acceder directement a un snapshot
- **Kiosk** : Cliquer pour avancer dans le parcours client

---

## Architecture des Donnees

Tous les mockups partagent `demo-data.js` qui exporte un objet global `DEMO_DATA` contenant:

- **36 clients** avec tickets, services, horaires, temps d'attente
- **6 snapshots** temporels (14:00, 14:10, 14:15, 14:30, 14:45, 15:00)
- **Etat des guichets** a chaque snapshot (G1-G4)
- **Recommandations IA** adaptees a chaque moment
- **Donnees HQ** pour 5 agences du reseau
- **Previsions** de demande avec intervalle de confiance

---

## Liens Utiles

- **App live (si disponible):** `http://localhost:5173`
- **Visuels existants:** voir `docs/demo/visuals/` pour les mockups HTML combines
- **Scripts demo:** voir `docs/demo/` pour le script en francais et les profils clients
- **Seed database:** `pnpm db:seed-demo` pour peupler avec les donnees de demo
