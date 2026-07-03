// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import {
  IonPage, IonContent, IonItem, IonLabel, IonInput,
  IonButton, IonText, IonSpinner, IonHeader, IonToolbar, IonTitle,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { AuthService } from '../../services/AuthService';

const LoginPage: React.FC = () => {
  const history = useHistory();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [erreur,   setErreur]   = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErreur('Email et mot de passe obligatoires.');
      return;
    }

    setLoading(true);
    setErreur('');

    const { success, error } = await AuthService.login(email, password);

    setLoading(false);

    if (success) {
      history.replace('/tabs/dashboard');
    } else {
      setErreur(error ?? 'Erreur de connexion.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>LOCI — Connexion</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        {/* Logo / titre */}
        <div style={{ textAlign: 'center', margin: '40px 0 32px' }}>
          <h1 style={{ fontSize: 48, margin: 0 }}>📍</h1>
          <h2 style={{ margin: '8px 0 0', color: 'var(--ion-color-primary)' }}>
            LOCI
          </h2>
          <p style={{ color: '#888', margin: 0 }}>
            Localisez tous vos objets
          </p>
        </div>

        {/* Formulaire */}
        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonChange={e => setEmail(e.detail.value!)}
            autocomplete="email"
          />
        </IonItem>

        <IonItem style={{ marginTop: 12 }}>
          <IonLabel position="floating">Mot de passe</IonLabel>
          <IonInput
            type="password"
            value={password}
            onIonChange={e => setPassword(e.detail.value!)}
            onKeyPress={e => e.key === 'Enter' && handleLogin()}
          />
        </IonItem>

        {/* Erreur */}
        {erreur && (
          <IonText color="danger">
            <p style={{ margin: '12px 16px 0', fontSize: 14 }}>{erreur}</p>
          </IonText>
        )}

        {/* Bouton connexion */}
        <IonButton
          expand="block"
          style={{ margin: '24px 0 12px' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <IonSpinner name="crescent" /> : 'Se connecter'}
        </IonButton>

        {/* Lien inscription */}
        <IonButton
          expand="block"
          fill="outline"
          onClick={() => history.push('/register')}
        >
          Créer un compte
        </IonButton>

      </IonContent>
    </IonPage>
  );
};

export default LoginPage;