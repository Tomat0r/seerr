import PageTitle from '@app/components/Common/PageTitle';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useIntl } from 'react-intl';

const ArtistPage: NextPage = () => {
  const intl = useIntl();
  const router = useRouter();
  const { artistId } = router.query;

  return (
    <>
      <PageTitle
        title={intl.formatMessage({
          id: 'artist',
          defaultMessage: 'Artist',
        })}
      />
      <div className="mt-6">
        <div className="mb-8">
          <h3 className="text-xl">
            {intl.formatMessage(
              {
                id: 'artist.viewingartist',
                defaultMessage: 'Viewing Artist: {artistId}',
              },
              { artistId }
            )}
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            {intl.formatMessage({
              id: 'artist.detailscomingsoon',
              defaultMessage: 'Artist details and album list coming soon!',
            })}
          </p>
        </div>
      </div>
    </>
  );
};

export default ArtistPage;
