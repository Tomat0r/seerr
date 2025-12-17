import logger from '@server/logger';
import ServarrBase from './base';

export interface LidarrArtistOptions {
  artistName: string;
  foreignArtistId: string;
  qualityProfileId: number;
  metadataProfileId: number;
  rootFolderPath: string;
  tags: number[];
  monitored?: boolean;
  searchNow?: boolean;
}

export interface LidarrAlbum {
  id: number;
  title: string;
  disambiguation?: string;
  overview?: string;
  artistId: number;
  foreignAlbumId: string;
  monitored: boolean;
  anyReleaseOk: boolean;
  profileId: number;
  duration: number;
  albumType: string;
  secondaryTypes: string[];
  mediumCount: number;
  ratings: {
    votes: number;
    value: number;
  };
  releaseDate: string;
  releases: {
    id: number;
    albumId: number;
    foreignReleaseId: string;
    title: string;
    status: string;
    duration: number;
    trackCount: number;
    media: {
      mediumNumber: number;
      mediumName: string;
      mediumFormat: string;
    }[];
    mediumCount: number;
    disambiguation?: string;
    country: string[];
    label: string[];
    format?: string;
    monitored: boolean;
  }[];
  genres: string[];
  media: {
    mediumNumber: number;
    mediumName: string;
    mediumFormat: string;
  }[];
  artist?: {
    artistName: string;
    foreignArtistId: string;
  };
  images: {
    coverType: string;
    url: string;
  }[];
  statistics?: {
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
}

export interface LidarrArtist {
  id: number;
  artistName: string;
  foreignArtistId: string;
  tadbId: number;
  discogsId: number;
  overview: string;
  artistType: string;
  disambiguation?: string;
  links: {
    url: string;
    name: string;
  }[];
  images: {
    coverType: string;
    url: string;
  }[];
  path: string;
  qualityProfileId: number;
  metadataProfileId: number;
  monitored: boolean;
  rootFolderPath?: string;
  genres: string[];
  cleanName: string;
  sortName: string;
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  statistics?: {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
  addOptions?: {
    monitor: string;
    searchForMissingAlbums?: boolean;
  };
}

class LidarrAPI extends ServarrBase<{ artistId: number; albumId?: number }> {
  constructor({ url, apiKey }: { url: string; apiKey: string }) {
    super({ url, apiKey, cacheName: 'lidarr', apiName: 'Lidarr' });
  }

  public getArtists = async (): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist');

      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artists: ${e.message}`);
    }
  };

  public getArtist = async ({ id }: { id: number }): Promise<LidarrArtist> => {
    try {
      const response = await this.axios.get<LidarrArtist>(`/artist/${id}`);

      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artist: ${e.message}`);
    }
  };

  public async getArtistByForeignId(
    foreignArtistId: string
  ): Promise<LidarrArtist> {
    try {
      const response = await this.axios.get<LidarrArtist[]>(
        '/artist/lookup',
        {
          params: {
            term: `lidarr:${foreignArtistId}`,
          },
        }
      );

      if (!response.data[0]) {
        throw new Error('Artist not found');
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving artist by foreign ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        foreignArtistId,
      });
      throw new Error('Artist not found');
    }
  }

  public async searchArtist(query: string): Promise<LidarrArtist[]> {
    try {
      const response = await this.axios.get<LidarrArtist[]>(
        '/artist/lookup',
        {
          params: {
            term: query,
          },
        }
      );

      return response.data;
    } catch (e) {
      logger.error('Error searching for artist', {
        label: 'Lidarr API',
        errorMessage: e.message,
        query,
      });
      throw new Error('Failed to search for artist');
    }
  }

  public addArtist = async (
    options: LidarrArtistOptions
  ): Promise<LidarrArtist> => {
    try {
      const artist = await this.getArtistByForeignId(options.foreignArtistId);

      // Check if artist already exists and has tracks
      if (artist.id && artist.statistics && artist.statistics.trackFileCount > 0) {
        logger.info(
          'Artist already exists and is available. Skipping add and returning success',
          {
            label: 'Lidarr',
            artist,
          }
        );
        return artist;
      }

      // Artist exists in Lidarr but is not monitored
      if (artist.id && !artist.monitored) {
        const response = await this.axios.put<LidarrArtist>('/artist', {
          ...artist,
          artistName: options.artistName,
          foreignArtistId: options.foreignArtistId,
          qualityProfileId: options.qualityProfileId,
          metadataProfileId: options.metadataProfileId,
          rootFolderPath: options.rootFolderPath,
          tags: Array.from(new Set([...artist.tags, ...options.tags])),
          monitored: options.monitored ?? true,
          addOptions: {
            monitor: 'all',
            searchForMissingAlbums: options.searchNow ?? false,
          },
        });

        if (response.data.monitored) {
          logger.info('Artist updated and monitored in Lidarr', {
            label: 'Lidarr',
            artistId: response.data.id,
            artistName: response.data.artistName,
          });
        }

        return response.data;
      }

      // Add new artist
      const response = await this.axios.post<LidarrArtist>('/artist', {
        artistName: options.artistName,
        foreignArtistId: options.foreignArtistId,
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags,
        monitored: options.monitored ?? true,
        addOptions: {
          monitor: 'all',
          searchForMissingAlbums: options.searchNow ?? false,
        },
      });

      logger.info('Artist added to Lidarr', {
        label: 'Lidarr',
        artistId: response.data.id,
        artistName: response.data.artistName,
      });

      return response.data;
    } catch (e) {
      logger.error('Failed to add artist to Lidarr', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
      });
      throw new Error(`[Lidarr] Failed to add artist: ${e.message}`);
    }
  };

  public getMetadataProfiles = async (): Promise<
    { id: number; name: string }[]
  > => {
    try {
      const data = await this.getRolling<{ id: number; name: string }[]>(
        '/metadataProfile',
        undefined,
        3600
      );

      return data;
    } catch (e) {
      throw new Error(
        `[Lidarr] Failed to retrieve metadata profiles: ${e.message}`
      );
    }
  };

  public getAlbumsByArtist = async (
    artistId: number
  ): Promise<LidarrAlbum[]> => {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album', {
        params: {
          artistId,
        },
      });

      return response.data;
    } catch (e) {
      throw new Error(
        `[Lidarr] Failed to retrieve albums for artist: ${e.message}`
      );
    }
  };

  public getAlbum = async (albumId: number): Promise<LidarrAlbum> => {
    try {
      const response = await this.axios.get<LidarrAlbum>(`/album/${albumId}`);

      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve album: ${e.message}`);
    }
  };
}

export default LidarrAPI;
