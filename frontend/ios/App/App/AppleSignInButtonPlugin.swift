import Capacitor
import AuthenticationServices
import UIKit

/**
 * Boton oficial de Sign in with Apple (ASAuthorizationAppleIDButton) dibujado
 * por el propio sistema encima del WebView. App Review rechazo un boton HTML
 * con el logo de Apple dibujado a mano (Guideline 4: el logo debe salir de
 * Apple Design Resources); el boton nativo trae el logo, la tipografia y el
 * texto localizado que Apple exige sin depender de assets propios.
 *
 * El HTML reserva un hueco (ver NativeAppleButtonDirective) y le manda aqui
 * su rectangulo en coordenadas del viewport cada vez que cambia; el boton es
 * subvista del WKWebView (no de su scrollView) porque la app hace scroll
 * dentro de <body>, no del documento, asi que las coordenadas del viewport
 * son las unicas que coinciden siempre. Al pulsarlo solo avisa al JS
 * ('tap'): la autorizacion en si la sigue haciendo
 * @capacitor-community/apple-sign-in como hasta ahora.
 */
@objc(AppleSignInButtonPlugin)
public class AppleSignInButtonPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInButtonPlugin"
    public let jsName = "AppleSignInButton"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    private var button: ASAuthorizationAppleIDButton?
    private var buttonStyle: ASAuthorizationAppleIDButton.Style?

    /// Crea el boton si no existe, o lo recoloca/actualiza si ya existe.
    @objc func show(_ call: CAPPluginCall) {
        let frame = CGRect(
            x: call.getDouble("x") ?? 0,
            y: call.getDouble("y") ?? 0,
            width: call.getDouble("width") ?? 0,
            height: call.getDouble("height") ?? 0
        )
        let cornerRadius = CGFloat(call.getDouble("cornerRadius") ?? 12)
        let enabled = call.getBool("enabled") ?? true
        let style: ASAuthorizationAppleIDButton.Style = call.getString("style") == "white" ? .white : .black

        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("WebView no disponible")
                return
            }
            // El estilo no se puede cambiar en un boton ya creado: si cambia
            // el tema (claro/oscuro) se recrea.
            if self.button == nil || self.buttonStyle != style {
                self.button?.removeFromSuperview()
                let button = ASAuthorizationAppleIDButton(authorizationButtonType: .continue, authorizationButtonStyle: style)
                button.addTarget(self, action: #selector(self.handleTap), for: .touchUpInside)
                webView.addSubview(button)
                self.button = button
                self.buttonStyle = style
            }
            guard let button = self.button else { return }
            button.frame = frame
            button.cornerRadius = cornerRadius
            button.isEnabled = enabled
            button.alpha = enabled ? 1 : 0.7
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.button?.removeFromSuperview()
            self.button = nil
            self.buttonStyle = nil
            call.resolve()
        }
    }

    @objc private func handleTap() {
        notifyListeners("tap", data: [:])
    }
}
