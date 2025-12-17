import PageTitle from '@app/components/Common/PageTitle';
import type { NextPage } from 'next';
import { useIntl } from 'react-intl';

const MusicPage: NextPage = () => {
  const intl = useIntl();

  return (
    <>
      <PageTitle
        title={intl.formatMessage({
          id: 'music',
          defaultMessage: 'Music',
        })}
      />
      <div className="mt-6">
        <div className="mb-8">
          <h3 className="text-xl">
            {intl.formatMessage({
              id: 'music.comingsoon',
              defaultMessage: 'Music browsing and requests coming soon!',
            })}
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            {intl.formatMessage({
              id: 'music.description',
              defaultMessage:
                'Browse and request your favorite artists and albums. Configure Lidarr in settings to get started.',
            })}
          </p>
        </div>
      </div>
    </>
  );
};

export default MusicPage;
