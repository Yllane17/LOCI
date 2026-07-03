// src/components/ObjetCard.tsx
import React from 'react';
import {
  IonItem, IonLabel, IonNote, IonIcon, IonItemSliding,
  IonItemOptions, IonItemOption,
} from '@ionic/react';
import { archiveOutline, bluetoothOutline, qrCodeOutline } from 'ionicons/icons';
import { Objet } from '../models/ObjetModel';

interface Props {
  objet: Objet;
  onOuvrir: () => void;
  onSupprimer: () => void;
}

const ObjetCard: React.FC<Props> = ({ objet, onOuvrir, onSupprimer }) => {
  const icone  = objet.categorie === 'connecte' ? bluetoothOutline : qrCodeOutline;
  const statutCouleurs: Partial<Record<Objet['statut'], string>> = {
    LocaliseScanRecent: '#4CAF50',
    AlerteEnCours:      '#FF9800',
  };
  const couleurStatut = statutCouleurs[objet.statut] ?? '#9E9E9E';

  const labelDate = objet.derniereTs
    ? `Vu le ${new Date(objet.derniereTs).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}`
    : 'Jamais scanné';

  return (
    <IonItemSliding>

      {/* Swipe gauche → Archiver */}
      <IonItemOptions side="end">
        <IonItemOption color="warning" onClick={onSupprimer}>
          <IonIcon slot="icon-only" icon={archiveOutline} />
        </IonItemOption>
      </IonItemOptions>

      <IonItem button onClick={onOuvrir} detail>
        {/* Icône catégorie */}
        <IonIcon
          icon={icone}
          slot="start"
          style={{ fontSize: 28, color: 'var(--ion-color-primary)' }}
        />

        <IonLabel>
          <h2 style={{ fontWeight: 600 }}>{objet.nom}</h2>
          <IonNote style={{ fontSize: 12 }}>{labelDate}</IonNote>
          {objet.typeConnectivite && (
            <IonNote style={{ fontSize: 11, display: 'block', color: '#aaa' }}>
              {objet.typeConnectivite}
            </IonNote>
          )}
        </IonLabel>

        {/* Point de statut */}
        <div
          slot="end"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            backgroundColor: couleurStatut,
            marginRight: 4,
          }}
        />
      </IonItem>
    </IonItemSliding>
  );
};

export default ObjetCard;