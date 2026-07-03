import React, { useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonButton, IonToast, IonSpinner, IonText,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { AuthService } from '../../services/AuthService';

const RegisterPage: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastColor, setToastColor] = useState<'danger' | 'success'>('danger');

  const register = async () => {
    // Validation basique
    if (!email || !password || !confirmPassword) {
      setMessage('Tous les champs sont obligatoires.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await AuthService.register(email, password);
      if (success) {
        setMessage('Compte créé avec succès ! Redirection...');
        setToastColor('success');
        setShowToast(true);
        setTimeout(() => {
          history.push('/tabs/dashboard');
        }, 1500);
      } else {
        setMessage(error ?? 'Impossible de créer le compte.');
        setToastColor('danger');
        setShowToast(true);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de connexion au serveur.';
      setMessage(errorMsg);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Inscription</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <IonText color="medium">
            <p style={{ textAlign: 'center' }}>Créer votre compte LOCI</p>
          </IonText>
        </div>

        <IonList>
          <IonItem>
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput
              type="email"
              value={email}
              onIonChange={e => setEmail(e.detail.value ?? '')}
              placeholder="votre@email.com"
              disabled={loading}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Mot de passe</IonLabel>
            <IonInput
              type="password"
              value={password}
              onIonChange={e => setPassword(e.detail.value ?? '')}
              placeholder="Au moins 6 caractères"
              disabled={loading}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Confirmer le mot de passe</IonLabel>
            <IonInput
              type="password"
              value={confirmPassword}
              onIonChange={e => setConfirmPassword(e.detail.value ?? '')}
              placeholder="Réentrez votre mot de passe"
              disabled={loading}
            />
          </IonItem>
        </IonList>

        <IonButton 
          expand="block" 
          onClick={register} 
          disabled={!email || !password || !confirmPassword || loading}
          style={{ marginTop: '2rem' }}
        >
          {loading ? <IonSpinner name="dots" /> : 'Créer un compte'}
        </IonButton>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <IonText color="medium">
            <small>Vous avez déjà un compte ? <a href="/login">Se connecter</a></small>
          </IonText>
        </div>

        <IonToast
          isOpen={showToast}
          message={message}
          duration={toastColor === 'success' ? 2000 : 3000}
          color={toastColor}
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default RegisterPage;
