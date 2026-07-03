import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonButton,
} from '@ionic/react';
import { AuthService } from '../services/AuthService';

const ParametresPage: React.FC = () => {
  const deconnexion = async () => {
    await AuthService.logout();
    window.location.href = '/login';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Paramètres</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonLabel>
              <h2>Paramètres de l'application</h2>
              <p>Gérez votre compte, notifications et préférences.</p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>
              <h3>Version</h3>
              <p>1.0.0</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonButton expand="block" color="danger" onClick={deconnexion}>
          Se déconnecter
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default ParametresPage;
