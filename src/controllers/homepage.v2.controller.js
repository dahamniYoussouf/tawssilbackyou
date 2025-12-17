import * as restaurantService from "../services/restaurant.service.js";
import { getHomepageModules } from "../services/homepage.service.js";
import { buildNearbyFilters, normalizeCategories } from "./homepage.controller.js";

const sendSseEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if (typeof res.flush === "function") {
    res.flush();
  }
};

const streamModulesEvent = async (res) => {
  const modules = await getHomepageModules();
  sendSseEvent(res, "modules", { success: true, data: modules });
};

const streamNearbyEvent = async (res, filterPayload) => {
  const nearby = await restaurantService.filterNearbyRestaurants(filterPayload);
  sendSseEvent(res, "nearby", {
    success: true,
    data: {
      count: nearby.count,
      page: nearby.page,
      pageSize: nearby.pageSize,
      radius: nearby.radius,
      center: nearby.center,
      searchType: nearby.searchType,
      data: nearby.formatted
    }
  });
};

export const streamHomepageOverview = async (req, res, next) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.flushHeaders();

  const clientId = req.user?.client_id;
  if (!clientId) {
    sendSseEvent(res, "error", {
      success: false,
      message: "Client profile not found"
    });
    res.end();
    return;
  }

  const filterPayload = {
    ...req.body,
    categories: normalizeCategories(req.body.categories),
    client_id: clientId
  };
  const nearbyFilters = buildNearbyFilters(filterPayload);
  nearbyFilters.client_id = clientId;

  try {
    await streamModulesEvent(res);
  } catch (err) {
    sendSseEvent(res, "error", {
      success: false,
      message: err.message || "Unable to load homepage modules"
    });
    res.end();
    return;
  }

  try {
    await streamNearbyEvent(res, nearbyFilters);
    sendSseEvent(res, "done", { success: true });
    res.end();
  } catch (err) {
    sendSseEvent(res, "error", {
      success: false,
      message: err.message || "Unable to load nearby restaurants"
    });
    res.end();
  }
};
