// The handful of Node-API (C ABI, stable since N-API 1–4) declarations this module uses, copied by signature from
// node_api.h / js_native_api.h so the build needs neither Node headers nor node-addon-api. The symbols come from the
// host process at load time (-undefined dynamic_lookup).
#ifndef CU_NODE_API_MIN_H
#define CU_NODE_API_MIN_H

#include <stddef.h>
#include <stdint.h>

typedef struct napi_env__ *napi_env;
typedef struct napi_value__ *napi_value;
typedef struct napi_callback_info__ *napi_callback_info;
typedef struct napi_deferred__ *napi_deferred;
typedef struct napi_async_work__ *napi_async_work;

typedef int napi_status;   // napi_status enum; only napi_ok (0) is compared
#define napi_ok 0

typedef napi_value (*napi_callback)(napi_env env, napi_callback_info info);
typedef void (*napi_async_execute_callback)(napi_env env, void *data);
typedef void (*napi_async_complete_callback)(napi_env env, napi_status status, void *data);

#define NAPI_AUTO_LENGTH SIZE_MAX

napi_status napi_create_function(napi_env env, const char *utf8name, size_t length, napi_callback cb, void *data, napi_value *result);
napi_status napi_set_named_property(napi_env env, napi_value object, const char *utf8name, napi_value value);
napi_status napi_get_cb_info(napi_env env, napi_callback_info cbinfo, size_t *argc, napi_value *argv, napi_value *this_arg, void **data);
napi_status napi_get_value_string_utf8(napi_env env, napi_value value, char *buf, size_t bufsize, size_t *result);
napi_status napi_create_string_utf8(napi_env env, const char *str, size_t length, napi_value *result);
napi_status napi_throw_type_error(napi_env env, const char *code, const char *msg);
napi_status napi_create_promise(napi_env env, napi_deferred *deferred, napi_value *promise);
napi_status napi_resolve_deferred(napi_env env, napi_deferred deferred, napi_value resolution);
napi_status napi_reject_deferred(napi_env env, napi_deferred deferred, napi_value rejection);
napi_status napi_create_error(napi_env env, napi_value code, napi_value msg, napi_value *result);
napi_status napi_create_async_work(napi_env env, napi_value async_resource, napi_value async_resource_name,
                                   napi_async_execute_callback execute, napi_async_complete_callback complete,
                                   void *data, napi_async_work *result);
napi_status napi_queue_async_work(napi_env env, napi_async_work work);
napi_status napi_delete_async_work(napi_env env, napi_async_work work);

#endif
