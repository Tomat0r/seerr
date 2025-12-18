import Modal from '@app/components/Common/Modal';
import SensitiveInput from '@app/components/Common/SensitiveInput';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { isValidURL } from '@app/utils/urlValidationHelper';
import { Transition } from '@headlessui/react';
import type { LidarrSettings } from '@server/lib/settings';
import axios from 'axios';
import { Field, Formik } from 'formik';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Select from 'react-select';
import { useToasts } from 'react-toast-notifications';
import * as Yup from 'yup';

type OptionType = {
  value: number | string | undefined;
  label: string;
};

export interface LidarrTestResponse {
  profiles: {
    id: number;
    name: string;
  }[];
  metadataProfiles: {
    id: number;
    name: string;
  }[];
  rootFolders: {
    id: number;
    path: string;
  }[];
  tags: {
    id: number;
    label: string;
  }[];
  urlBase?: string;
}

const messages = defineMessages('components.Settings.LidarrModal', {
  createlidarr: 'Add New Lidarr Server',
  editlidarr: 'Edit Lidarr Server',
  validationNameRequired: 'You must provide a server name',
  validationHostnameRequired: 'You must provide a valid hostname or IP address',
  validationPortRequired: 'You must provide a valid port number',
  validationApiKeyRequired: 'You must provide an API key',
  validationRootFolderRequired: 'You must select a root folder',
  validationProfileRequired: 'You must select a quality profile',
  validationMetadataProfileRequired: 'You must select a metadata profile',
  toastLidarrTestSuccess: 'Lidarr connection established successfully!',
  toastLidarrTestFailure: 'Failed to connect to Lidarr.',
  add: 'Add Server',
  defaultserver: 'Default Server',
  servername: 'Server Name',
  hostname: 'Hostname or IP Address',
  port: 'Port',
  ssl: 'Use SSL',
  apiKey: 'API Key',
  baseUrl: 'URL Base',
  syncEnabled: 'Enable Scan',
  externalUrl: 'External URL',
  qualityprofile: 'Quality Profile',
  metadataprofile: 'Metadata Profile',
  rootfolder: 'Root Folder',
  selectQualityProfile: 'Select quality profile',
  selectMetadataProfile: 'Select metadata profile',
  selectRootFolder: 'Select root folder',
  loadingprofiles: 'Loading quality profiles…',
  loadingmetadataprofiles: 'Loading metadata profiles…',
  testFirstQualityProfiles: 'Test connection to load quality profiles',
  testFirstMetadataProfiles: 'Test connection to load metadata profiles',
  loadingrootfolders: 'Loading root folders…',
  testFirstRootFolders: 'Test connection to load root folders',
  loadingTags: 'Loading tags…',
  testFirstTags: 'Test connection to load tags',
  tags: 'Tags',
  enableSearch: 'Enable Automatic Search',
  tagRequests: 'Tag Requests',
  tagRequestsInfo:
    "Automatically add an additional tag with the requester's user ID & display name",
  validationApplicationUrl: 'You must provide a valid URL',
  validationApplicationUrlTrailingSlash: 'URL must not end in a trailing slash',
  validationBaseUrlLeadingSlash: 'URL base must have a leading slash',
  validationBaseUrlTrailingSlash: 'URL base must not end in a trailing slash',
  notagoptions: 'No tags.',
  selecttags: 'Select tags',
});

interface LidarrModalProps {
  lidarr: LidarrSettings | null;
  onClose: () => void;
  onSave: () => void;
}

const LidarrModal = ({ onClose, lidarr, onSave }: LidarrModalProps) => {
  const intl = useIntl();
  const initialLoad = useRef(false);
  const { addToast } = useToasts();
  const [isValidated, setIsValidated] = useState(lidarr ? true : false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<LidarrTestResponse>({
    profiles: [],
    metadataProfiles: [],
    rootFolders: [],
    tags: [],
  });

  const LidarrSettingsSchema = Yup.object().shape({
    name: Yup.string().required(
      intl.formatMessage(messages.validationNameRequired)
    ),
    hostname: Yup.string().required(
      intl.formatMessage(messages.validationHostnameRequired)
    ),
    port: Yup.number()
      .nullable()
      .required(intl.formatMessage(messages.validationPortRequired)),
    apiKey: Yup.string().required(
      intl.formatMessage(messages.validationApiKeyRequired)
    ),
    rootFolder: Yup.string().required(
      intl.formatMessage(messages.validationRootFolderRequired)
    ),
    activeProfileId: Yup.string().required(
      intl.formatMessage(messages.validationProfileRequired)
    ),
    activeMetadataProfileId: Yup.string().required(
      intl.formatMessage(messages.validationMetadataProfileRequired)
    ),
    externalUrl: Yup.string()
      .test(
        'valid-url',
        intl.formatMessage(messages.validationApplicationUrl),
        isValidURL
      )
      .test(
        'no-trailing-slash',
        intl.formatMessage(messages.validationApplicationUrlTrailingSlash),
        (value) => !value || !value.endsWith('/')
      ),
    baseUrl: Yup.string()
      .test(
        'leading-slash',
        intl.formatMessage(messages.validationBaseUrlLeadingSlash),
        (value) => !value || value.startsWith('/')
      )
      .test(
        'no-trailing-slash',
        intl.formatMessage(messages.validationBaseUrlTrailingSlash),
        (value) => !value || !value.endsWith('/')
      ),
  });

  const testConnection = useCallback(
    async ({
      hostname,
      port,
      apiKey,
      baseUrl,
      useSsl = false,
    }: {
      hostname: string;
      port: number;
      apiKey: string;
      baseUrl?: string;
      useSsl?: boolean;
    }) => {
      setIsTesting(true);
      try {
        const response = await axios.post<LidarrTestResponse>(
          '/api/v1/settings/lidarr/test',
          {
            hostname,
            port,
            apiKey,
            baseUrl,
            useSsl,
          }
        );

        setIsValidated(true);
        setTestResponse(response.data);
        if (initialLoad.current) {
          addToast(intl.formatMessage(messages.toastLidarrTestSuccess), {
            appearance: 'success',
            autoDismiss: true,
          });
        }
      } catch (e) {
        setIsValidated(false);
        if (initialLoad.current) {
          addToast(intl.formatMessage(messages.toastLidarrTestFailure), {
            appearance: 'error',
            autoDismiss: true,
          });
        }
      } finally {
        setIsTesting(false);
        initialLoad.current = true;
      }
    },
    [addToast, intl]
  );

  useEffect(() => {
    if (lidarr) {
      testConnection({
        apiKey: lidarr.apiKey,
        hostname: lidarr.hostname,
        port: lidarr.port,
        baseUrl: lidarr.baseUrl,
        useSsl: lidarr.useSsl,
      });
    }
  }, [lidarr, testConnection]);

  return (
    <Transition
      as="div"
      appear
      show
      enter="transition-opacity ease-in-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity ease-in-out duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Formik
        initialValues={{
          name: lidarr?.name,
          hostname: lidarr?.hostname,
          port: lidarr?.port ?? 8686,
          ssl: lidarr?.useSsl ?? false,
          apiKey: lidarr?.apiKey,
          baseUrl: lidarr?.baseUrl,
          activeProfileId: lidarr?.activeProfileId,
          activeMetadataProfileId: lidarr?.activeMetadataProfileId,
          rootFolder: lidarr?.activeDirectory,
          activeDirectory: lidarr?.activeDirectory,
          tags: lidarr?.tags ?? [],
          isDefault: lidarr?.isDefault ?? false,
          is4k: false,
          externalUrl: lidarr?.externalUrl,
          syncEnabled: lidarr?.syncEnabled ?? false,
          preventSearch: lidarr?.preventSearch ?? false,
          tagRequests: lidarr?.tagRequests ?? false,
        }}
        validationSchema={LidarrSettingsSchema}
        onSubmit={async (values) => {
          try {
            const profileName = testResponse.profiles.find(
              (profile) => profile.id === Number(values.activeProfileId)
            )?.name;

            const metadataProfileName = testResponse.metadataProfiles.find(
              (profile) => profile.id === Number(values.activeMetadataProfileId)
            )?.name;

            const submission = {
              name: values.name,
              hostname: values.hostname,
              port: Number(values.port),
              apiKey: values.apiKey,
              useSsl: values.ssl,
              baseUrl: values.baseUrl,
              activeProfileId: Number(values.activeProfileId),
              activeProfileName: profileName,
              activeMetadataProfileId: Number(values.activeMetadataProfileId),
              activeMetadataProfileName: metadataProfileName,
              activeDirectory: values.activeDirectory,
              tags: values.tags,
              isDefault: values.isDefault,
              is4k: false,
              externalUrl: values.externalUrl,
              syncEnabled: values.syncEnabled,
              preventSearch: values.preventSearch,
              tagRequests: values.tagRequests,
            };

            if (!lidarr) {
              await axios.post('/api/v1/settings/lidarr', submission);
            } else {
              await axios.put(
                `/api/v1/settings/lidarr/${lidarr.id}`,
                submission
              );
            }

            onSave();
          } catch (e) {
            // Handle errors
          }
        }}
      >
        {({
          errors,
          touched,
          values,
          handleSubmit,
          setFieldValue,
          isSubmitting,
          isValid,
        }) => {
          return (
            <Modal
              onCancel={onClose}
              okButtonType="primary"
              okText={
                isSubmitting
                  ? intl.formatMessage(globalMessages.saving)
                  : lidarr
                    ? intl.formatMessage(globalMessages.save)
                    : intl.formatMessage(messages.add)
              }
              secondaryButtonType="warning"
              secondaryText={
                isTesting
                  ? intl.formatMessage(globalMessages.testing)
                  : intl.formatMessage(globalMessages.test)
              }
              onSecondary={() => {
                if (values.apiKey && values.hostname && values.port) {
                  testConnection({
                    apiKey: values.apiKey,
                    baseUrl: values.baseUrl,
                    hostname: values.hostname,
                    port: Number(values.port),
                    useSsl: values.ssl,
                  });
                }
              }}
              secondaryDisabled={
                !values.apiKey ||
                !values.hostname ||
                !values.port ||
                isTesting ||
                isSubmitting
              }
              okDisabled={
                !isValidated || isSubmitting || isTesting || !isValid
              }
              onOk={() => handleSubmit()}
              title={
                lidarr
                  ? intl.formatMessage(messages.editlidarr)
                  : intl.formatMessage(messages.createlidarr)
              }
            >
              <div className="section">
                <div className="form-row">
                  <label htmlFor="isDefault" className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isDefault"
                      id="isDefault"
                      checked={values.isDefault}
                      onChange={() => setFieldValue('isDefault', !values.isDefault)}
                    />
                    <span className="label-text">
                      {intl.formatMessage(messages.defaultserver)}
                    </span>
                  </label>
                </div>
                <div className="form-row">
                  <label htmlFor="name" className="text-label">
                    {intl.formatMessage(messages.servername)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="text"
                      inputMode="text"
                      id="name"
                      name="name"
                    />
                    {errors.name && touched.name && (
                      <div className="error">{errors.name}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="hostname" className="text-label">
                    {intl.formatMessage(messages.hostname)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="text"
                      inputMode="url"
                      id="hostname"
                      name="hostname"
                      placeholder="127.0.0.1"
                    />
                    {errors.hostname && touched.hostname && (
                      <div className="error">{errors.hostname}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="port" className="text-label">
                    {intl.formatMessage(messages.port)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="text"
                      inputMode="numeric"
                      id="port"
                      name="port"
                      placeholder="8686"
                    />
                    {errors.port && touched.port && (
                      <div className="error">{errors.port}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="ssl" className="checkbox-label">
                    <input
                      type="checkbox"
                      name="ssl"
                      id="ssl"
                      checked={values.ssl}
                      onChange={() => setFieldValue('ssl', !values.ssl)}
                    />
                    <span className="label-text">
                      {intl.formatMessage(messages.ssl)}
                    </span>
                  </label>
                </div>
                <div className="form-row">
                  <label htmlFor="apiKey" className="text-label">
                    {intl.formatMessage(messages.apiKey)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <SensitiveInput
                      as="field"
                      type="text"
                      inputMode="text"
                      id="apiKey"
                      name="apiKey"
                    />
                    {errors.apiKey && touched.apiKey && (
                      <div className="error">{errors.apiKey}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="baseUrl" className="text-label">
                    {intl.formatMessage(messages.baseUrl)}
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="text"
                      inputMode="text"
                      id="baseUrl"
                      name="baseUrl"
                    />
                    {errors.baseUrl && touched.baseUrl && (
                      <div className="error">{errors.baseUrl}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="activeProfileId" className="text-label">
                    {intl.formatMessage(messages.qualityprofile)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Select<OptionType>
                      options={
                        isValidated
                          ? testResponse.profiles.map((profile) => ({
                              label: profile.name,
                              value: profile.id,
                            }))
                          : []
                      }
                      isDisabled={!isValidated || isTesting}
                      isLoading={isTesting}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={
                        isValidated
                          ? {
                              value: values.activeProfileId,
                              label:
                                testResponse.profiles.find(
                                  (profile) =>
                                    profile.id === values.activeProfileId
                                )?.name ?? '',
                            }
                          : undefined
                      }
                      onChange={(value) =>
                        setFieldValue('activeProfileId', value?.value)
                      }
                      placeholder={
                        !isValidated
                          ? intl.formatMessage(
                              messages.testFirstQualityProfiles
                            )
                          : isTesting
                            ? intl.formatMessage(messages.loadingprofiles)
                            : intl.formatMessage(messages.selectQualityProfile)
                      }
                    />
                    {errors.activeProfileId && touched.activeProfileId && (
                      <div className="error">{errors.activeProfileId}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="activeMetadataProfileId" className="text-label">
                    {intl.formatMessage(messages.metadataprofile)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Select<OptionType>
                      options={
                        isValidated
                          ? testResponse.metadataProfiles.map((profile) => ({
                              label: profile.name,
                              value: profile.id,
                            }))
                          : []
                      }
                      isDisabled={!isValidated || isTesting}
                      isLoading={isTesting}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={
                        isValidated
                          ? {
                              value: values.activeMetadataProfileId,
                              label:
                                testResponse.metadataProfiles.find(
                                  (profile) =>
                                    profile.id === values.activeMetadataProfileId
                                )?.name ?? '',
                            }
                          : undefined
                      }
                      onChange={(value) =>
                        setFieldValue('activeMetadataProfileId', value?.value)
                      }
                      placeholder={
                        !isValidated
                          ? intl.formatMessage(
                              messages.testFirstMetadataProfiles
                            )
                          : isTesting
                            ? intl.formatMessage(messages.loadingmetadataprofiles)
                            : intl.formatMessage(messages.selectMetadataProfile)
                      }
                    />
                    {errors.activeMetadataProfileId && touched.activeMetadataProfileId && (
                      <div className="error">{errors.activeMetadataProfileId}</div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="rootFolder" className="text-label">
                    {intl.formatMessage(messages.rootfolder)}
                    <span className="label-required">*</span>
                  </label>
                  <div className="form-input-area">
                    <Select<OptionType>
                      options={
                        isValidated
                          ? testResponse.rootFolders.map((folder) => ({
                              label: folder.path,
                              value: folder.id,
                            }))
                          : []
                      }
                      isDisabled={!isValidated || isTesting}
                      isLoading={isTesting}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      value={
                        values.activeDirectory
                          ? {
                              value: values.activeDirectory,
                              label: values.activeDirectory,
                            }
                          : undefined
                      }
                      onChange={(value) => {
                        setFieldValue('activeDirectory', value?.label);
                        setFieldValue('rootFolder', value?.label);
                      }}
                      placeholder={
                        !isValidated
                          ? intl.formatMessage(messages.testFirstRootFolders)
                          : isTesting
                            ? intl.formatMessage(messages.loadingrootfolders)
                            : intl.formatMessage(messages.selectRootFolder)
                      }
                    />
                    {errors.rootFolder && touched.rootFolder && (
                      <div className="error">{errors.rootFolder}</div>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          );
        }}
      </Formik>
    </Transition>
  );
};

export default LidarrModal;
