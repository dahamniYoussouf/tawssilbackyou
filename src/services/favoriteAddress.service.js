import { Op } from "sequelize";
import FavoriteAddress from "../models/FavoriteAddress.js";

const MAX_FAVORITE_ADDRESSES = 5;

export async function listFavoriteAddresses(clientId) {
  return FavoriteAddress.findAll({
    where: { client_id: clientId },
    order: [["is_default", "DESC"], ["createdAt", "DESC"]],
  });
}

export async function createFavoriteAddress(clientId, payload) {
  const { name, address, icon_url, lat, lng, is_default } = payload;

  const existingCount = await FavoriteAddress.count({
    where: { client_id: clientId },
  });
  if (existingCount >= MAX_FAVORITE_ADDRESSES) {
    const error = new Error("Maximum 5 adresses favorites autorisees");
    error.status = 400;
    throw error;
  }

  if (is_default) {
    await FavoriteAddress.update(
      { is_default: false },
      { where: { client_id: clientId } }
    );
  }

  const fav = await FavoriteAddress.create({
    client_id: clientId,
    name,
    address,
    icon_url,
    lat,
    lng,
    is_default: !!is_default,
  });

  if (lng && lat) {
    fav.setCoordinates(lng, lat);
    await fav.save();
  }

  return fav;
}

export async function updateFavoriteAddress(clientId, id, payload) {
  const fav = await FavoriteAddress.findOne({
    where: { id, client_id: clientId },
  });
  if (!fav) return null;

  const { name, address, icon_url, lat, lng, is_default } = payload;

  if (is_default) {
    await FavoriteAddress.update(
      { is_default: false },
      { where: { client_id: clientId, id: { [Op.ne]: id } } }
    );
  }

  if (name !== undefined) fav.name = name;
  if (address !== undefined) fav.address = address;
  if (icon_url !== undefined) fav.icon_url = icon_url;
  if (lat !== undefined) fav.lat = lat;
  if (lng !== undefined) fav.lng = lng;
  if (is_default !== undefined) fav.is_default = !!is_default;

  if (lng !== undefined && lat !== undefined) {
    fav.setCoordinates(lng, lat);
  }
  await fav.save();
  return fav;
}

export async function deleteFavoriteAddress(clientId, id) {
  const deleted = await FavoriteAddress.destroy({
    where: { id, client_id: clientId },
  });
  return deleted > 0;
}
