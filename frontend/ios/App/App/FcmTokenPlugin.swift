import Foundation
import Capacitor
import FirebaseMessaging

/// Puente minimo entre FirebaseMessaging (nativo) y el JS de la app.
///
/// @capacitor/push-notifications solo sabe hablar de tokens de APNs en iOS
/// (el token crudo que Apple entrega al registrar el dispositivo). El backend
/// envia todos los pushes via firebase-admin/sendEachForMulticast, que exige
/// un token de FCM, no uno de APNs — de ahi que haga falta este plugin
/// separado: expone el token de FCM (el que Messaging.messaging() traduce a
/// partir del token de APNs, ver AppDelegate.didRegisterForRemoteNotifications)
/// para que PushNotificationsService lo mande al mismo endpoint que usan web
/// y Android.
@objc(FcmTokenPlugin)
public class FcmTokenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FcmTokenPlugin"
    public let jsName = "FcmTokenPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addListener", returnType: CAPPluginReturnCallback),
        CAPPluginMethod(name: "removeAllListeners", returnType: CAPPluginReturnPromise)
    ]

    private static weak var instance: FcmTokenPlugin?
    private static var latestToken: String?
    private var pendingCall: CAPPluginCall?

    public override func load() {
        FcmTokenPlugin.instance = self
        if let token = Messaging.messaging().fcmToken {
            FcmTokenPlugin.latestToken = token
        }
    }

    @objc func getToken(_ call: CAPPluginCall) {
        if let token = FcmTokenPlugin.latestToken {
            call.resolve(["token": token])
            return
        }
        // Todavia no ha llegado ningun token (registro en curso): se resuelve
        // mas tarde desde handleTokenRefresh, cuando Firebase lo entregue.
        call.keepAlive = true
        pendingCall = call
    }

    /// Llamado desde AppDelegate.messaging(_:didReceiveRegistrationToken:).
    static func handleTokenRefresh(_ token: String?) {
        latestToken = token
        guard let instance = instance else { return }
        instance.notifyListeners("fcmTokenReceived", data: ["token": token ?? ""])
        if let token = token, let pending = instance.pendingCall {
            pending.resolve(["token": token])
            instance.pendingCall = nil
        }
    }
}
