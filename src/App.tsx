// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton,
  IonIcon, IonLabel, setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  homeOutline, listOutline, qrCodeOutline,
  mapOutline, settingsOutline,
} from 'ionicons/icons';

import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import Dashboard    from './pages/Dashboard';
import ObjetsPage   from './pages/ObjetsPage';
import ObjetDetailPage from './pages/ObjetDetailPage';
import ScannerPage  from './pages/ScannerPage';
import CartePage    from './pages/CartePage';
import ParametresPage from './pages/ParametresPage';

import { AuthService } from './services/AuthService';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    AuthService.isLoggedIn().then(setConnecte);
  }, []);

  // Attendre la vérification de session avant de rendre
  if (connecte === null) return null;

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet id="main">

          {/* Routes auth */}
          <Route exact path="/login"    component={LoginPage} />
          <Route exact path="/register" component={RegisterPage} />

          {/* Application principale avec TabBar */}
          <Route path="/tabs">
            <IonTabs>
              <IonRouterOutlet>
                <Route exact path="/tabs/dashboard"  component={Dashboard} />
                <Route exact path="/tabs/objets"     component={ObjetsPage} />
                <Route exact path="/tabs/objets/nouveau"  component={ObjetDetailPage} />
                <Route exact path="/tabs/objets/:id" component={ObjetDetailPage} />
                <Route exact path="/tabs/scanner"    component={ScannerPage} />
                <Route exact path="/tabs/carte"      component={CartePage} />
                <Route exact path="/tabs/parametres" component={ParametresPage} />
              </IonRouterOutlet>

              {/* TabBar 5 onglets (section 7.1 du CDC) */}
              <IonTabBar slot="bottom">
                <IonTabButton tab="dashboard" href="/tabs/dashboard">
                  <IonIcon icon={homeOutline} />
                  <IonLabel>Accueil</IonLabel>
                </IonTabButton>
                <IonTabButton tab="objets" href="/tabs/objets">
                  <IonIcon icon={listOutline} />
                  <IonLabel>Objets</IonLabel>
                </IonTabButton>
                <IonTabButton tab="scanner" href="/tabs/scanner">
                  <IonIcon icon={qrCodeOutline} />
                  <IonLabel>Scanner</IonLabel>
                </IonTabButton>
                <IonTabButton tab="carte" href="/tabs/carte">
                  <IonIcon icon={mapOutline} />
                  <IonLabel>Carte</IonLabel>
                </IonTabButton>
                <IonTabButton tab="parametres" href="/tabs/parametres">
                  <IonIcon icon={settingsOutline} />
                  <IonLabel>Paramètres</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </Route>

          {/* Redirection par défaut */}
          <Route exact path="/">
            <Redirect to={connecte ? '/tabs/dashboard' : '/login'} />
          </Route>

        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;