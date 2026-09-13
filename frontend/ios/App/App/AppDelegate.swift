import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // MARK: - Push notifications
    //
    // @capacitor/push-notifications no registra estos callbacks por si solo:
    // depende de que el AppDelegate de la app se los reenvie via NotificationCenter.
    // Sin esto, ni 'registration' ni 'registrationError' llegaban nunca al JS
    // (PushNotificationsService.enableNative() se quedaba colgado para siempre).

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        // Firebase necesita el token de APNs para poder emitir un token de FCM
        // valido (didReceiveRegistrationToken, abajo). Sin esta linea, Messaging
        // se queda sin saber a que dispositivo/entorno APNs asociar el token.
        Messaging.messaging().apnsToken = deviceToken

        // Pedimos el token de FCM de forma activa, con manejo de error
        // explicito, en vez de esperar solo a didReceiveRegistrationToken:
        // ese metodo de delegado no tiene ninguna variante de fallo, asi
        // que si Firebase nunca resuelve un token (proyecto mal
        // configurado, red...) antes esto no daba ninguna pista - el JS
        // solo veia pasar el timeout sin saber por que.
        Messaging.messaging().token { [weak self] token, error in
            if let error = error {
                self?.deliverFcmTokenErrorToWebView(error)
            } else if let token = token {
                self?.deliverFcmTokenToWebView(token)
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        // Este es el token que hay que mandar al backend (el mismo que usan
        // web y Android via firebase-admin/sendEachForMulticast) — NO el token
        // crudo de APNs que emite @capacitor/push-notifications en 'registration'.
        //
        // Se entrega al JS inyectandolo directamente en el WebView en vez de
        // via un plugin nativo propio de Capacitor: un plugin Swift-only
        // "local" (sin paquete/target separado) puede quedar fuera del
        // binario final en un build de Release/App Store si nada lo
        // referencia de forma estatica (el linker lo trata como codigo
        // muerto, ya que solo el escaneo en tiempo de ejecucion de Capacitor
        // lo usaba) — confirmado en dispositivo real: "FcmTokenPlugin is not
        // implemented on ios" pese a compilar. evaluateJavaScript no depende
        // de ningun mecanismo de descubrimiento de plugins.
        guard let fcmToken = fcmToken else { return }
        deliverFcmTokenToWebView(fcmToken)
    }

    private func currentBridgeViewController() -> CAPBridgeViewController? {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                if let bridgeVC = window.rootViewController as? CAPBridgeViewController {
                    return bridgeVC
                }
            }
        }
        return nil
    }

    private func deliverFcmTokenToWebView(_ token: String) {
        let escaped = Self.escapeForJsStringLiteral(token)
        let js = "window.__piqoFcmToken = '\(escaped)';" +
            "window.dispatchEvent(new CustomEvent('piqoFcmToken', { detail: '\(escaped)' }));"
        runInWebView(js)
    }

    private func deliverFcmTokenErrorToWebView(_ error: Error) {
        let escaped = Self.escapeForJsStringLiteral(error.localizedDescription)
        let js = "window.dispatchEvent(new CustomEvent('piqoFcmTokenError', { detail: '\(escaped)' }));"
        runInWebView(js)
    }

    private func runInWebView(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.currentBridgeViewController()?.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    // Escapado minimo para un literal de string en JS de una sola linea:
    // barra invertida primero (si no, escaparia de mas las comillas/saltos
    // de linea que se anaden despues), luego comillas simples y saltos de
    // linea (el mensaje de un NSError puede traer varias lineas).
    private static func escapeForJsStringLiteral(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
    }
}
