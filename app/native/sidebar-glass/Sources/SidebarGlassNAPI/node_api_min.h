// The handful of Node-API (C ABI, stable since N-API 1) declarations this module uses, copied by signature from
// node_api.h / js_native_api.h so the build needs neither Node headers nor node-addon-api. The symbols come from the
// host process at load time (-undefined dynamic_lookup).
#ifndef SG_NODE_API_MIN_H
#define SG_NODE_API_MIN_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct napi_env__ *napi_env;
typedef struct napi_value__ *napi_value;
typedef struct napi_callback_info__ *napi_callback_info;

typedef int napi_status;   // napi_status enum; only napi_ok (0) is compared
#define napi_ok 0

typedef enum {
  napi_undefined, napi_null, napi_boolean, napi_number, napi_string, napi_symbol, napi_object, napi_function, napi_external, napi_bigint,
} napi_valuetype;

typedef napi_value (*napi_callback)(napi_env env, napi_callback_info info);

#define NAPI_AUTO_LENGTH SIZE_MAX

napi_status napi_create_function(napi_env env, const char *utf8name, size_t length, napi_callback cb, void *data, napi_value *result);
napi_status napi_create_object(napi_env env, napi_value *result);
napi_status napi_set_named_property(napi_env env, napi_value object, const char *utf8name, napi_value value);
napi_status napi_get_named_property(napi_env env, napi_value object, const char *utf8name, napi_value *result);
napi_status napi_get_cb_info(napi_env env, napi_callback_info cbinfo, size_t *argc, napi_value *argv, napi_value *this_arg, void **data);
napi_status napi_typeof(napi_env env, napi_value value, napi_valuetype *result);
napi_status napi_get_value_double(napi_env env, napi_value value, double *result);
napi_status napi_get_value_int32(napi_env env, napi_value value, int32_t *result);
napi_status napi_get_value_bool(napi_env env, napi_value value, bool *result);
napi_status napi_get_boolean(napi_env env, bool value, napi_value *result);
napi_status napi_get_undefined(napi_env env, napi_value *result);
napi_status napi_throw_type_error(napi_env env, const char *code, const char *msg);

#endif
