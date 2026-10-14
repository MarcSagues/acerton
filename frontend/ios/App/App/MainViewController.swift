import UIKit
import Capacitor

/// CAPBridgeViewController propio solo para registrar los plugins que viven
/// dentro de la app (no en node_modules), que Capacitor no descubre solo.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInButtonPlugin())
    }
}
