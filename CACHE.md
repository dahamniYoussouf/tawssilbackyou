# Système de Cache

## Vue d'ensemble

Le système de cache a été intégré dans le backend pour améliorer les performances en réduisant les requêtes à la base de données.

## Fonctionnalités

- **Cache en mémoire** : Utilise `node-cache` par défaut
- **Support Redis** : Optionnel, pour la production (via variable d'environnement)
- **TTL (Time To Live)** : Expiration automatique des clés
- **Invalidation** : Suppression manuelle ou par pattern
- **Statistiques** : Suivi des hits/misses

## Configuration

### Variables d'environnement

```env
# Activer Redis (optionnel)
USE_REDIS=true
REDIS_URL=redis://localhost:6379
```

### Cache par défaut

- **TTL par défaut** : 5 minutes (300 secondes)
- **Type** : In-memory (node-cache)

## Endpoints mis en cache

### 1. Statistiques Dashboard
- **Endpoint** : `GET /admin/statistics`
- **TTL** : 2 minutes (120 secondes)
- **Clé** : `admin:statistics`

### 2. Configurations système
- **Endpoint** : `GET /admin/config/all`
- **TTL** : 5 minutes (300 secondes)
- **Clé** : `admin:configs:all`
- **Invalidation** : Automatique lors de la mise à jour d'une config

### 3. Top 10 Meals
- **Endpoint** : `GET /admin/top/meals`
- **TTL** : 10 minutes (600 secondes)
- **Clé** : `admin:top:meals`

### 4. Top 10 Restaurants
- **Endpoint** : `GET /admin/top/restaurants`
- **TTL** : 10 minutes (600 secondes)
- **Clé** : `admin:top:restaurants`

### 5. Top 10 Drivers
- **Endpoint** : `GET /admin/top/drivers`
- **TTL** : 10 minutes (600 secondes)
- **Clé** : `admin:top:drivers`

### 6. Nearby Restaurants
- **Endpoint** : `POST /restaurant/nearbyfilter`
- **TTL** : 3 minutes (180 secondes)
- **Clé** : `restaurant:nearby:{hash}` (basé sur les filtres de recherche)
- **Invalidation** : Automatique lors de la mise à jour d'un restaurant

### 7. Restaurant Details/Menu
- **Endpoint** : `GET /restaurant/details/:restaurantId`
- **TTL** : 5 minutes (300 secondes)
- **Clé** : `restaurant:details:{restaurantId}:client:{clientId}`
- **Invalidation** : Automatique lors de la mise à jour ou suppression d'un restaurant

## Gestion du cache

### Voir les statistiques du cache

```http
GET /admin/cache/stats
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "hits": 150,
    "misses": 25,
    "sets": 30,
    "deletes": 5,
    "total": 175,
    "hitRate": "85.71%",
    "type": "In-Memory",
    "keys": 8
  }
}
```

### Vider tout le cache

```http
POST /admin/cache/clear
Authorization: Bearer <token>
```

### Invalider par pattern

```http
POST /admin/cache/invalidate/:pattern
Authorization: Bearer <token>
```

**Exemple** :
```http
POST /admin/cache/invalidate/statistics
```

Invalide toutes les clés contenant "statistics".

## Utilisation dans le code

### Utiliser le cache service directement

```javascript
import cacheService from '../services/cache.service.js';

// Get from cache
const cached = await cacheService.get('my-key');
if (cached) {
  return cached;
}

// Set in cache
await cacheService.set('my-key', data, 300); // 5 minutes

// Delete from cache
await cacheService.del('my-key');

// Delete by pattern
await cacheService.delPattern('admin:*');
```

### Utiliser cacheHelpers

```javascript
import { cacheHelpers } from '../middlewares/cache.middleware.js';

const result = await cacheHelpers.cacheFunction(
  'my-key',
  async () => {
    // Expensive operation
    return await fetchDataFromDB();
  },
  600 // 10 minutes TTL
);
```

### Middleware de cache automatique

```javascript
import { cacheMiddleware } from '../middlewares/cache.middleware.js';

router.get('/my-route', 
  cacheMiddleware({ ttl: 300 }),
  myController
);
```

## Invalidation automatique

Le cache est automatiquement invalidé lors de :
- Mise à jour d'une configuration (`PUT /admin/config/:key`)
- Modification de `max_orders_per_driver`

## Bonnes pratiques

1. **TTL approprié** :
   - Données fréquemment mises à jour : 1-2 minutes
   - Données relativement statiques : 5-10 minutes
   - Données très statiques : 30+ minutes

2. **Clés de cache** :
   - Utiliser un préfixe : `admin:`, `user:`, etc.
   - Inclure des identifiants si nécessaire : `admin:statistics:user:123`

3. **Invalidation** :
   - Toujours invalider le cache lors des modifications
   - Utiliser des patterns pour invalider plusieurs clés à la fois

4. **Performance** :
   - Ne pas mettre en cache les données sensibles ou personnelles
   - Surveiller les statistiques pour optimiser les TTL

## Installation

Le package `node-cache` est déjà ajouté au `package.json`. Pour installer :

```bash
npm install
```

Pour utiliser Redis (optionnel) :

```bash
npm install redis
```

Puis configurez les variables d'environnement.

