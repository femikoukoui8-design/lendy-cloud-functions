# LENDY — MASTER SPECIFICATION

*Document vivant — mis à jour au fil des décisions. Dernière mise à jour : 14 août 2026.*

---

## 1. Vision

Lendy est une marketplace locale de location de matériel **photo, vidéo et drone entre particuliers**, ouverte au **grand public** (pas uniquement aux professionnels de l'audiovisuel). L'objectif est de permettre à toute personne — voyageur, créateur en devenir, curieux — d'expérimenter du matériel sans l'acheter, en le récupérant en main propre auprès d'un particulier proche de chez elle.

Lancement prévu : **Paris**, en mode **location uniquement** (pas de vente au lancement).

---

## 2. Problème

Beaucoup de personnes ont un besoin ponctuel de matériel photo/vidéo/drone sans vouloir l'acheter :
- un voyageur qui veut de meilleures photos/vidéos pour un weekend ou des vacances ;
- une personne qui veut **tester une pratique avant de s'investir** (photo, vidéo, création de contenu, entrepreneuriat) sans acheter un appareil coûteux qui finira peu utilisé.

À l'inverse, des particuliers possèdent ce matériel et l'utilisent peu.

---

## 3. Proposition de valeur

- **Locataire** : *"Le bon matériel pour ton prochain voyage ou pour te lancer — sans l'acheter, récupéré près de chez toi."*
- **Loueur** : *"Ton appareil photo, ta caméra ou ton drone qui dort dans un tiroir peut te rapporter de l'argent."*

---

## 4. Personas

**Loueur** — possède un hybride, une action cam ou un drone grand public utilisé occasionnellement. Motivé par un revenu complémentaire simple, sans complexité.

**Locataire — profil "voyageur"** — part en weekend/vacances, veut de meilleures photos/vidéos sans investir dans un appareil qui servira peu.

**Locataire — profil "débutant qui se lance"** — jeune créateur de contenu, entrepreneur qui veut tester la vidéo/photo pour son projet avant d'investir dans son propre matériel.

---

## 5. Positionnement

Différenciation vis-à-vis du concurrent principal identifié (Lightyshare, voir section 6) sur trois piliers :
1. **Catalogue curé pour le grand public** — matériel accessible (hybrides, action cams, drones grand public), pas de matériel cinéma professionnel.
2. **Parcours guidé par intention** — recherche par "je pars en voyage / je me lance / j'ai un projet ponctuel" plutôt que par fiches techniques.
3. **Application mobile native** — messagerie fluide avec notifications push, état des lieux photo intégré. Différenciateur potentiel car Lightyshare semble fonctionner uniquement en version web (à reconfirmer, information datant d'une étude UX de 2024).

---

## 6. Analyse concurrentielle

**Lightyshare** (concurrent principal) :
- Fondé en 2016, leader français de la location de matériel audiovisuel entre particuliers/professionnels, très fort à Paris (siège social).
- ~30 000 avis vérifiés, note 4,98/5, plus de 25 000 références.
- Assurance casse/vol incluse jusqu'à 150 000€.
- Commission : 5% HT côté locataire (min. 7€ HT) + 15% + TVA côté loueur (~20% de take rate cumulé).
- Points faibles identifiés : UX/recherche jugée datée par des avis utilisateurs, pas d'application mobile native identifiée, signalements de tentatives de phishing visant les loueurs.
- Catalogue orienté matériel professionnel (cinéma, marques pro), moins accessible à un débutant.

**Autres acteurs** (moins pertinents pour ce positionnement) : Lokio (généraliste multi-catégories), Kiwiiz/Omniloc (annuaires généralistes peu différenciés), Jam (pas un vrai concurrent — fonctionne par système de "Pass"/troc, pas de transaction monétaire, page dédiée gaming inactive).

---

## 7. Business model

- Commission sur location (modèle à deux faces, locataire + loueur, à l'image du marché).
- **Montant précis non encore fixé** — benchmark Lightyshare : ~20% cumulé (5% locataire + 15% loueur + TVA).
- Pas d'assurance intégrée prévue au lancement (trop coûteuse à monter seule) — à compenser par une politique de caution stricte.

*Question ouverte : taux de commission définitif à trancher.*

---

## 8. MVP

- **Location uniquement** (pas de vente au lancement — prévu en V2).
- **Remise en main propre uniquement** (pas de livraison au lancement).
- Marché de lancement : **Paris**.
- Catégories : appareils photo hybrides/compacts grand public, action cams, drones grand public, accessoires simples (trépieds, micros externes, stabilisateurs légers).
- Exclu du V1 : matériel cinéma professionnel (optiques cinéma, caméras RED/ARRI, éclairage lourd).

---

## 9. Fonctionnalités MVP

- Compte / profil utilisateur unique (un même utilisateur peut être loueur et locataire).
- Annonces avec photos, disponibilité, prix.
- Recherche géolocalisée, avec parcours guidé par intention.
- Réservation par dates.
- Messagerie in-app avec notifications push.
- Paiement + caution via Stripe Connect (voir section 15 et 17).
- État des lieux photo intégré à l'app (avant/après, horodaté).
- Évaluations post-transaction.

---

## 10. Parcours utilisateur (location)

Choix d'intention (voyage / se lancer / projet ponctuel) → recommandations adaptées → consultation de l'annonce → sélection des dates → demande de réservation → échange via messagerie in-app → paiement + pré-autorisation de la caution → récupération en main propre avec état des lieux photo → utilisation → restitution avec état des lieux photo → libération ou capture de la caution → évaluation.

---

## 11. Règles métier

- Location uniquement pour la V1 ; vente prévue en V2.
- Remise en main propre uniquement pour la V1 ; livraison éventuelle en V2.
- Pas de location de jeux vidéo (logiciels) envisagée — cadre juridique français peu clair sur ce point, sans lien avec le positionnement actuel mais retenu comme apprentissage.
- Drones : affichage obligatoire d'un rappel des zones de vol interdites (Paris intra-muros est en zone réglementée P23) avec lien vers l'outil officiel de vérification (Géoportail/cartes.gouv.fr). Ne pas mettre en avant un usage "vol dans Paris" dans le marketing.

---

## 12-14. UX / UI / Design System

- Direction initiale : palette verte (#7ED957, #FAFAFA, #111111, #6B7280), typographie Poppins, inspiration Apple/Airbnb — **non re-validée** depuis le recentrage sur le positionnement photo/vidéo/drone grand public. À retravailler.
- Différenciateur produit clé : parcours par intention plutôt que recherche technique (voir section 5).

*Section à développer.*

---

## 15. Architecture technique

- FlutterFlow comme environnement de développement.
- Backend envisagé : Firebase (Authentication, Firestore, Storage) — **comparaison avec Supabase mentionnée en amont du projet mais jamais tranchée explicitement**, reste une question ouverte.
- Paiement : Stripe Connect (modèle "Destination charges").
  - Caution gérée par pré-autorisation (blocage sans prélèvement, capture uniquement en cas de dommage).
  - Limite technique : une pré-autorisation Stripe ne dure que 7 jours maximum — compatible avec des locations courtes (weekend, quelques jours), ce qui correspond à l'usage attendu.
  - Implémentation nécessitant des Cloud Functions appelées via Custom Actions FlutterFlow (pas d'intégration no-code native pour la gestion fine des pré-autorisations).

*Question ouverte : Firebase vs Supabase à trancher formellement.*

---

## 16. Base de données

*Non abordée à ce stade — à concevoir lors de la phase d'architecture.*

---

## 17. Sécurité

- Caution : pré-autorisation Stripe Connect, capture partielle ou totale en cas de dommage constaté.
- État des lieux photo horodaté intégré à l'app, avant et après chaque location.
- Vérification d'identité des utilisateurs : niveau non encore défini.
- Pas d'assurance intégrée prévue au lancement (voir section 7).

---

## 18. Roadmap

- **V1** : location uniquement, remise en main propre, Paris, catalogue grand public photo/vidéo/drone.
- **V2** (non détaillée) : vente, livraison, expansion géographique, assurance intégrée, vérification d'identité renforcée.

---

## 19. Stratégie marketing

*À retravailler spécifiquement pour le positionnement photo/vidéo/drone grand public — les réflexions précédentes portaient sur d'autres niches (gaming, AV événementiel) écartées depuis.*

---

## 20. Stratégie de lancement

- Démarrage sur Paris, avec une logique d'amorçage de l'offre avant la demande (recruter des loueurs avant d'ouvrir largement aux locataires).
- Réflexion à approfondir sur le calendrier et les leviers d'acquisition spécifiques à ce persona (voyageurs, créateurs débutants).

---

## 21. KPIs

*Non définis à ce stade.*

---

## 22. Décisions prises

- Nom du projet : **Lendy** (conservé malgré le risque de réputation identifié, voir section 24).
- Modèle : location uniquement pour le MVP (pas de vente).
- Remise en main propre uniquement pour le MVP (pas de livraison).
- Catégorie : photo, vidéo, drone — positionnement grand public, pas professionnel.
- Marché de lancement : Paris.
- Paiement/caution : Stripe Connect avec pré-autorisation.
- Stack technique de départ : FlutterFlow + Firebase (backend à reconfirmer).

---

## 23. Questions ouvertes

- Taux de commission définitif (locataire / loueur).
- Montant de caution par catégorie de matériel.
- Firebase vs Supabase — choix définitif du backend.
- Niveau de vérification d'identité à l'inscription.
- Stratégie marketing et calendrier d'acquisition détaillés pour ce persona.
- Palette et identité visuelle à revalider pour le nouveau positionnement.
- Budget et temps disponibles pour le lancement (non communiqués à ce stade).

---

## 24. Risques

- **Concurrentiel** : Lightyshare est très implanté à Paris (siège social, forte densité d'offre), avec une communauté et une confiance déjà établies.
- **Réputation du nom** : "Lendy" est le nom d'une plateforme britannique de prêt entre particuliers (immobilier) ayant fait faillite en 2019, avec une procédure judiciaire encore active. Risque de confusion/SEO, assumé par choix du fondateur pour l'instant.
- **Réglementaire (drones)** : Paris intra-muros est classée zone de survol réglementé (P23) ; nécessite une communication claire in-app pour éviter tout usage illégal par les locataires.
- **Matériel de valeur/fragile** : le matériel photo/vidéo/drone a une valeur et une fragilité plus élevées que d'autres catégories envisagées, ce qui renforce l'importance d'une politique de caution robuste dès le MVP, en l'absence d'assurance intégrée.
- **Absence d'assurance intégrée au lancement**, contrairement à Lightyshare — à surveiller comme argument de confiance à développer avant de pouvoir rivaliser frontalement.

---

*Chaque nouvelle décision prise en conversation doit être ajoutée à ce document — sections 22 (Décisions prises), 23 (Questions ouvertes) et 24 (Risques) en priorité.*
