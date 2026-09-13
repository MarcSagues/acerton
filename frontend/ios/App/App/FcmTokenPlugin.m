#import "App-Swift.h"
#import <Capacitor/Capacitor.h>

// Sin este archivo, el build de Release/App Store podia eliminar la clase
// Swift FcmTokenPlugin por "codigo muerto" (nada la referenciaba de forma
// estatica, solo el escaneo del runtime de Capacitor via CAPBridgedPlugin) -
// sintoma: "FcmTokenPlugin is not implemented on ios" pese a compilar bien.
// Esta categoria Objective-C obliga al linker a resolver la clase en tiempo
// de enlazado, reteniendola.
CAP_PLUGIN(FcmTokenPlugin, "FcmTokenPlugin",
  CAP_PLUGIN_METHOD(getToken, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(addListener, CAPPluginReturnCallback);
  CAP_PLUGIN_METHOD(removeAllListeners, CAPPluginReturnPromise);
)
