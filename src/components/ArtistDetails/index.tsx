import PageTitle from '@app/components/Common/PageTitle';
import { useRouter } from 'next/router';
import React from 'react';
import { useIntl } from 'react-intl';

const ArtistDetails = () => {
  const intl = useIntl();
  const router = useRouter();
  const { artistId } = router.query;

  return (
    <>
      <PageTitle
        title={intl.formatMessage({
          id: 'artist.details',
          defaultMessage: 'Artist Details',
        })}
      />
      <div className="media-page">
        <div className="media-header">
          <div className="media-poster"></div>
          <div className="media-title">
            <h1>
              {intl.formatMessage(
                {
                  id: 'artist.name',
                  defaultMessage: 'Artist {artistId}',
                },
                { artistId }
              )}
            </h1>
          </div>
        </div>
        <div className="media-content">
          <div className="mt-8">
            <h2 className="text-xl">
              {intl.formatMessage({
                id: 'artist.albums',
                defaultMessage: 'Albums',
              })}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {intl.formatMessage({
                id: 'artist.albumlistcomingsoon',
                defaultMessage: 'Album list coming soon!',
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtistDetails;
