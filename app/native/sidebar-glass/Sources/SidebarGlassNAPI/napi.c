// sidebar_glass.node: the module's `sidebarGlass` namespace, {show, hide, setTint, clearTint}, as the official
// 4.16336.0 add-on registers it (ClaudeSwift/NAPIBindings+SidebarGlass.swift; registration at 0x84028, callbacks
// show 0x839dc, hide 0x83be8, setTint 0x83b6c, clearTint 0x83bb4; evidence in sidebar-glass-re.json "napi").
// Every call runs synchronously on the JS thread, which in Electron's main process is AppKit's main thread (the
// official bindings run the work in MainActor.assumeIsolated; so does SidebarGlass.swift).
//
//   show({windowNumber, width, backing?, systemBacking?, appKitSidebar?}) → boolean
//   hide() → undefined
//   setTint({rgba, width}) → boolean
//   clearTint() → undefined
//
// Argument errors are TypeErrors with the official messages. Property readers follow the official NAPIUtils:
// an Int is a finite, integral number in int32 range (napiGetIntProperty 0x1609bc), a Double any number
// (napiGetDoubleProperty 0x160af0), a Bool a boolean (napiGetBoolProperty 0x1608e8), an object typeof "object"
// (napiIsObject 0x15fdf8); a missing argument reads as nil (NAPICallbackInfo.arg 0x161ae4).
#include <math.h>
#include "node_api_min.h"
#include "include/sidebar_glass_napi.h"

typedef struct { bool ok; int64_t value; } opt_int;
typedef struct { bool ok; double value; } opt_double;
typedef struct { bool ok; bool value; } opt_bool;

static napi_value property(napi_env env, napi_value object, const char *name) {
  napi_value value = NULL;
  if (napi_get_named_property(env, object, name, &value) != napi_ok) return NULL;
  return value;
}
static bool is_type(napi_env env, napi_value value, napi_valuetype type) {
  napi_valuetype actual;
  return value && napi_typeof(env, value, &actual) == napi_ok && actual == type;
}
static opt_int int_property(napi_env env, napi_value object, const char *name) {
  opt_int out = { false, 0 };
  napi_value value = property(env, object, name);
  double number;
  if (!is_type(env, value, napi_number) || napi_get_value_double(env, value, &number) != napi_ok) return out;
  if (!isfinite(number) || number != round(number) || number < -2147483648.0 || number > 2147483647.0) return out;
  int32_t integer = 0;
  if (napi_get_value_int32(env, value, &integer) != napi_ok) return out;
  out.ok = true; out.value = integer;
  return out;
}
static opt_double double_property(napi_env env, napi_value object, const char *name) {
  opt_double out = { false, 0 };
  napi_value value = property(env, object, name);
  if (is_type(env, value, napi_number) && napi_get_value_double(env, value, &out.value) == napi_ok) out.ok = true;
  return out;
}
static opt_bool bool_property(napi_env env, napi_value object, const char *name) {
  opt_bool out = { false, false };
  napi_value value = property(env, object, name);
  if (is_type(env, value, napi_boolean) && napi_get_value_bool(env, value, &out.value) == napi_ok) out.ok = true;
  return out;
}
// The official binding's check that an optional field it could not read is absent: napiGetProperty, then
// napiIsUndefined (0x83178–0x83258). A field that is there with the wrong type makes the request invalid.
static bool present(napi_env env, napi_value object, const char *name) {
  napi_value value = property(env, object, name);
  return value && !is_type(env, value, napi_undefined);
}
// napiGetCallbackInfo(expectedArgs: 1) + arg(0): nil when the call has no argument.
static bool first_argument(napi_env env, napi_callback_info info, napi_value *argument, bool *got_info) {
  size_t argc = 1;
  napi_value argv[1] = { NULL };
  *got_info = napi_get_cb_info(env, info, &argc, argv, NULL, NULL) == napi_ok;
  *argument = *got_info && argc >= 1 ? argv[0] : NULL;
  return *argument != NULL;
}
static napi_value boolean(napi_env env, bool value) {
  napi_value result = NULL;
  napi_get_boolean(env, value, &result);
  return result;
}
static napi_value undefined(napi_env env) {
  napi_value result = NULL;
  napi_get_undefined(env, &result);
  return result;
}

// show: SidebarGlassShowArgs (0x83de4) → SidebarGlassShowOptions (0x83c6c) → SidebarGlass.show (0x11b18c).
static napi_value show(napi_env env, napi_callback_info info) {
  napi_value options;
  bool got_info;
  if (!first_argument(env, info, &options, &got_info) || !is_type(env, options, napi_object)) {
    napi_throw_type_error(env, NULL, got_info ? "SidebarGlassShowArgs: argument 0 ('options') must be SidebarGlassShowOptions"
                                              : "SidebarGlassShowArgs: expected 1 argument(s)");
    return NULL;
  }
  opt_int window_number = int_property(env, options, "windowNumber");
  if (!window_number.ok) { napi_throw_type_error(env, NULL, "SidebarGlassShowOptions: missing or invalid 'windowNumber' (Int)"); return NULL; }
  opt_double width = double_property(env, options, "width");
  if (!width.ok) { napi_throw_type_error(env, NULL, "SidebarGlassShowOptions: missing or invalid 'width' (Double)"); return NULL; }
  opt_int backing = int_property(env, options, "backing");
  opt_bool system_backing = bool_property(env, options, "systemBacking");
  opt_bool appkit_sidebar = bool_property(env, options, "appKitSidebar");
  bool invalid = (!backing.ok && present(env, options, "backing"))
              || (!system_backing.ok && present(env, options, "systemBacking"))
              || (!appkit_sidebar.ok && present(env, options, "appKitSidebar"));
  // closure 0x841c8: an invalid request passes backing -1 (never a colour), which show refuses.
  bool shown = sg_show(window_number.value, width.value, invalid ? -1 : backing.value, !backing.ok && !invalid,
                       system_backing.ok && system_backing.value, appkit_sidebar.ok && appkit_sidebar.value);
  return boolean(env, shown);
}

// setTint: SidebarGlassTintArgs (0x83edc) → closure 0x83ae4 → SidebarGlass.setTint (0x11d408). An rgba that is not
// a whole number in 0…0xffffffff goes on as -1, which setTint refuses (and takes the tint off).
static napi_value set_tint(napi_env env, napi_callback_info info) {
  napi_value options;
  bool got_info;
  if (!first_argument(env, info, &options, &got_info) || !is_type(env, options, napi_object)) {
    napi_throw_type_error(env, NULL, got_info ? "SidebarGlassTintArgs: argument 0 ('options') must be SidebarGlassTintOptions"
                                              : "SidebarGlassTintArgs: expected 1 argument(s)");
    return NULL;
  }
  opt_double rgba = double_property(env, options, "rgba");
  if (!rgba.ok) { napi_throw_type_error(env, NULL, "SidebarGlassTintOptions: missing or invalid 'rgba' (Double)"); return NULL; }
  opt_double width = double_property(env, options, "width");
  if (!width.ok) { napi_throw_type_error(env, NULL, "SidebarGlassTintOptions: missing or invalid 'width' (Double)"); return NULL; }
  bool valid = isfinite(rgba.value) && rgba.value == round(rgba.value) && rgba.value >= 0 && rgba.value <= 4294967295.0;
  return boolean(env, sg_set_tint(valid ? (int64_t)rgba.value : -1, width.value));
}

static napi_value hide(napi_env env, napi_callback_info info) {
  (void)info;
  sg_hide();
  return undefined(env);
}

static napi_value clear_tint(napi_env env, napi_callback_info info) {
  (void)info;
  sg_clear_tint();
  return undefined(env);
}

static void method(napi_env env, napi_value object, const char *name, napi_callback cb) {
  napi_value fn;
  if (napi_create_function(env, name, NAPI_AUTO_LENGTH, cb, NULL, &fn) == napi_ok) napi_set_named_property(env, object, name, fn);
}

__attribute__((visibility("default"))) int32_t node_api_module_get_api_version_v1(void) { return 8; }

__attribute__((visibility("default"))) napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  napi_value glass;
  if (napi_create_object(env, &glass) != napi_ok) return exports;
  method(env, glass, "show", show);
  method(env, glass, "hide", hide);
  method(env, glass, "setTint", set_tint);
  method(env, glass, "clearTint", clear_tint);
  napi_set_named_property(env, exports, "sidebarGlass", glass);
  return exports;
}
