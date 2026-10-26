const sections = [
  {
    titre: 'Données collectées',
    texte:
      'Nom, prénom, adresse e-mail universitaire, filière, niveau, matières et centres d’intérêt, photo de profil facultative, ainsi que le contenu que vous publiez (annonces, trajets, groupes, événements, messages).',
  },
  {
    titre: 'Pourquoi',
    texte:
      'Pour faire fonctionner les services (contacter un vendeur, réserver un trajet), vous envoyer les notifications utiles (réservation, message, rappel d’événement) et vous recommander des groupes et événements proches de vos matières.',
  },
  {
    titre: 'Analyse et modèles',
    texte:
      'Les statistiques du tableau de bord et l’entraînement des modèles (prix conseillé, recommandations) n’utilisent que des données agrégées ou anonymisées. Aucun nom ni e-mail n’est transmis au service d’analyse.',
  },
  {
    titre: 'Sécurité',
    texte: 'Les mots de passe sont hachés (bcrypt) et jamais stockés en clair. La session repose sur un jeton signé conservé dans un cookie inaccessible aux scripts.',
  },
  {
    titre: 'Vos droits',
    texte: 'Vous pouvez modifier votre profil à tout moment. Pour supprimer votre compte, contactez l’administration du campus ; vos contenus sont alors masqués et vos données personnelles anonymisées.',
  },
];

export default function Confidentialite() {
  return (
    <article className="mx-auto flex max-w-[68ch] flex-col gap-8 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Politique de confidentialité</h1>
        <p className="text-muted-foreground">Seules les données nécessaires au service sont collectées.</p>
      </header>
      {sections.map((s) => (
        <section key={s.titre} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.titre}</h2>
          <p className="leading-relaxed text-foreground-2">{s.texte}</p>
        </section>
      ))}
    </article>
  );
}
