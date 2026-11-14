// computer_use.node: one export, `call(method, paramsJson) → Promise<string>`. The work runs on a libuv worker
// thread (cu_call may block on ScreenCaptureKit; never on Electron's main thread), the promise settles on the JS
// thread with the JSON envelope cu_call returned. Every cu_call result is released with cu_free exactly once.
#include <stdlib.h>
#include <string.h>
#include "node_api_min.h"

extern char *cu_call(const char *method, const char *params);
extern void cu_free(char *pointer);

typedef struct {
  char *method;
  char *params;
  char *result;
  napi_deferred deferred;
  napi_async_work work;
} cu_work;

static char *copy_string(napi_env env, napi_value value) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok) return NULL;
  char *buffer = malloc(length + 1);
  if (!buffer) return NULL;
  if (napi_get_value_string_utf8(env, value, buffer, length + 1, &length) != napi_ok) { free(buffer); return NULL; }
  return buffer;
}

static void execute(napi_env env, void *data) {
  (void)env;
  cu_work *work = data;
  work->result = cu_call(work->method, work->params);
}

static void complete(napi_env env, napi_status status, void *data) {
  cu_work *work = data;
  napi_value value;
  if (status == napi_ok && work->result && napi_create_string_utf8(env, work->result, NAPI_AUTO_LENGTH, &value) == napi_ok) {
    napi_resolve_deferred(env, work->deferred, value);
  } else {
    napi_value message, error;
    napi_create_string_utf8(env, "computer_use: native call did not complete", NAPI_AUTO_LENGTH, &message);
    napi_create_error(env, NULL, message, &error);
    napi_reject_deferred(env, work->deferred, error);
  }
  if (work->result) cu_free(work->result);
  free(work->method);
  free(work->params);
  napi_delete_async_work(env, work->work);
  free(work);
}

static napi_value call(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  if (napi_get_cb_info(env, info, &argc, argv, NULL, NULL) != napi_ok || argc < 2) {
    napi_throw_type_error(env, NULL, "call(method, paramsJson) takes two strings");
    return NULL;
  }
  cu_work *work = calloc(1, sizeof(cu_work));
  if (!work) return NULL;
  work->method = copy_string(env, argv[0]);
  work->params = copy_string(env, argv[1]);
  if (!work->method || !work->params) {
    free(work->method); free(work->params); free(work);
    napi_throw_type_error(env, NULL, "call(method, paramsJson) takes two strings");
    return NULL;
  }
  napi_value promise, name;
  napi_create_promise(env, &work->deferred, &promise);
  napi_create_string_utf8(env, "computer_use.call", NAPI_AUTO_LENGTH, &name);
  napi_create_async_work(env, NULL, name, execute, complete, work, &work->work);
  napi_queue_async_work(env, work->work);
  return promise;
}

__attribute__((visibility("default"))) int32_t node_api_module_get_api_version_v1(void) { return 8; }

__attribute__((visibility("default"))) napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, "call", NAPI_AUTO_LENGTH, call, NULL, &fn);
  napi_set_named_property(env, exports, "call", fn);
  return exports;
}
