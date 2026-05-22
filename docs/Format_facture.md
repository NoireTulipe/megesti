Formats de facture

Pour envoyer une facture, il faut la générer dans le bon format.
Norme sémantique EN16931

La norme EN16931 définit le « modèle sémantique de données des éléments essentiels d’une facture électronique ». C’est ce standard européen qu’il faut suivre pour générer une facture électronique.

Mais cette norme ne définit que le modèle de données, il faut ensuite les repésenter dans un format concret.

De plus, chaque pays peut ajouter des règles supplémentaires à respecter.
Formats concrets

Pour la France, les trois format officiels sont :

    Factur-X France
    UBL France
    CII France

Pour le réseau Peppol, le format officiel est :

    Peppol BIS / UBL

Les formats UBL et CII sont des fichiers XML. Le format Factur-X est un PDF 2-en-1 composé d’un lisible avec en pièce-jointe un fichier XML au format CII.
Générer une facture

En pratique, pour générer une facture, il faut lire la documentation qui se rapporte au pays dans lequel la facture sera échangée, voir le paragraphe Normes ci-dessous.

Ensuite, il faut choisir un format dans lequel représenter les données. Le choix du format peut être influencé par les pratiques de votre industrie, mais il a peu d’importance dans le fond puisque toutes les plateformes doivent proposer la conversion d’un format à l’autre.

Le langage de programmation ou le framework que vous utilisez peut proposer des paquets qui facilitent la génération de factures.

Une fois la facture générée, nous vous conseillons de systématiquement la valider avec le validateur de l’API SUPER PDP. En fonction du format de la facture automatiquement détecté, le validateur applique les derniers jeux de règles de validation en vigueur, les « schematrons ».

Il est prévu que notre API permette de générer une facture à partir de données JSON suivant le modèle EN16931, ce qui permet de vous éviter de générer du XML.
Normes

La norme XP Z12-012 sur le site de l’AFNOR, disponible gratuitement. C’est ce document là qu’il faut lire en priorité pour la réforme de la facturation électronique en France.

La norme XP Z12-014 sur le site de l’AFNOR, disponible gratuitement. Ce document vient compléter la norme XP Z12-012 avec des cas d’usage B2B et des exemple pratiques.

La documentation Peppol BIS / UBL en accès libre. C’est cette documentation qu’il faut lire pour envoyer et recevoir des factures sur le réseau Peppol standard.

La norme EN16931 sur le site de l’AFNOR, disponible gratuitement. Ce document définit de manière plus théorique la norme EN16931.


--------------------------


