import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { Watchlist } from '@server/entity/Watchlist';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';

const musicRoutes = Router();

/**
 * Search for artists using Lidarr
 * GET /api/v1/music/search
 */
musicRoutes.get('/search', async (req, res, next) => {
  const settings = getSettings();
  const query = req.query.query as string;

  if (!query) {
    return next({
      status: 400,
      message: 'Missing query parameter',
    });
  }

  try {
    // Get the first configured Lidarr instance
    const lidarrSettings = settings.lidarr.find((l) => l.isDefault) || settings.lidarr[0];

    if (!lidarrSettings) {
      return next({
        status: 500,
        message: 'Lidarr is not configured',
      });
    }

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
    });

    const artists = await lidarr.searchArtist(query);

    // Map artists to a simplified format
    const results = artists.map((artist) => ({
      id: artist.foreignArtistId,
      artistName: artist.artistName,
      disambiguation: artist.disambiguation,
      overview: artist.overview,
      artistType: artist.artistType,
      images: artist.images,
      genres: artist.genres,
      links: artist.links,
      statistics: artist.statistics,
    }));

    return res.status(200).json({
      results,
      totalResults: results.length,
    });
  } catch (e) {
    logger.error('Failed to search for artists', {
      label: 'Music API',
      errorMessage: e.message,
      query,
    });
    return next({
      status: 500,
      message: 'Failed to search for artists',
    });
  }
});

/**
 * Get artist details by foreign artist ID (MusicBrainz ID)
 * GET /api/v1/music/artist/:id
 */
musicRoutes.get('/artist/:id', async (req, res, next) => {
  const settings = getSettings();
  const foreignArtistId = req.params.id;

  try {
    // Get the first configured Lidarr instance
    const lidarrSettings = settings.lidarr.find((l) => l.isDefault) || settings.lidarr[0];

    if (!lidarrSettings) {
      return next({
        status: 500,
        message: 'Lidarr is not configured',
      });
    }

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
    });

    const artist = await lidarr.getArtistByForeignId(foreignArtistId);

    // Check if the artist is already in our media database
    const media = await getRepository(Media).findOne({
      where: {
        foreignArtistId,
        mediaType: MediaType.MUSIC,
      },
      relations: { requests: true },
    });

    // Check if on user's watchlist
    const onUserWatchlist = await getRepository(Watchlist).exist({
      where: {
        media: {
          foreignArtistId,
          mediaType: MediaType.MUSIC,
        },
        requestedBy: {
          id: req.user?.id,
        },
      },
    });

    return res.status(200).json({
      ...artist,
      mediaInfo: media,
      onUserWatchlist,
    });
  } catch (e) {
    logger.error('Failed to get artist details', {
      label: 'Music API',
      errorMessage: e.message,
      foreignArtistId,
    });
    return next({
      status: 500,
      message: 'Failed to get artist details',
    });
  }
});

/**
 * Get albums for an artist
 * GET /api/v1/music/artist/:id/albums
 */
musicRoutes.get('/artist/:id/albums', async (req, res, next) => {
  const settings = getSettings();
  const foreignArtistId = req.params.id;

  try {
    // Get the first configured Lidarr instance
    const lidarrSettings = settings.lidarr.find((l) => l.isDefault) || settings.lidarr[0];

    if (!lidarrSettings) {
      return next({
        status: 500,
        message: 'Lidarr is not configured',
      });
    }

    const lidarr = new LidarrAPI({
      apiKey: lidarrSettings.apiKey,
      url: LidarrAPI.buildUrl(lidarrSettings, '/api/v1'),
    });

    // First get the artist to find their Lidarr ID
    const artist = await lidarr.getArtistByForeignId(foreignArtistId);

    if (!artist.id) {
      return next({
        status: 404,
        message: 'Artist not found in Lidarr',
      });
    }

    // Get albums for the artist
    const albums = await lidarr.getAlbumsByArtist(artist.id);

    return res.status(200).json({
      albums,
      totalResults: albums.length,
    });
  } catch (e) {
    logger.error('Failed to get artist albums', {
      label: 'Music API',
      errorMessage: e.message,
      foreignArtistId,
    });
    return next({
      status: 500,
      message: 'Failed to get artist albums',
    });
  }
});

export default musicRoutes;
