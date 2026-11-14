// Public header of the N-API glue target (SwiftPM C targets need one). The module's only export is the Node-API
// registration symbol; Node finds it by name when it loads sidebar_glass.node. The Swift side's C entry points
// (SidebarGlass.swift @_cdecl) are declared here for the glue.
#ifndef SIDEBAR_GLASS_NAPI_H
#define SIDEBAR_GLASS_NAPI_H

#include <stdbool.h>
#include <stdint.h>

bool sg_show(int64_t window_number, double width, int64_t backing, bool backing_is_nil, bool system_backing, bool appkit_sidebar);
void sg_hide(void);
bool sg_set_tint(int64_t rgba, double width);
void sg_clear_tint(void);

#endif
