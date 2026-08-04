import { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfigProvider,
  Layout,
  message,
  Modal,
  Result,
  Spin,
} from 'antd';
import {
  CopyOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';

import { HttpUtil, ClipboardManager, FileManager } from '@/utils';
import { useTheme } from '@/hooks/useTheme';
import { useStatusQuery } from '@/api/queries/useStatusQuery';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import AppSidebar from '@/layouts/AppSidebar';
import { LazyMount } from '@/components/utility';
import { setMessageInstance } from '@/utils/messageBus';
import StatusCard from './StatusCard';
import XrayStatusCard from './XrayStatusCard';
import type { PanelUpdateInfo } from './PanelUpdateModal';
import ResellerDashboard from './ResellerDashboard';

const JsonEditor = lazy(() => import('@/components/form/JsonEditor'));
const PanelUpdateModal = lazy(() => import('./PanelUpdateModal'));
const LogModal = lazy(() => import('./LogModal'));
const BackupModal = lazy(() => import('./BackupModal'));
const SystemHistoryModal = lazy(() => import('./SystemHistoryModal'));
const XrayMetricsModal = lazy(() => import('./XrayMetricsModal'));
const XrayLogModal = lazy(() => import('./XrayLogModal'));
const VersionModal = lazy(() => import('./VersionModal'));
import './IndexPage.css';

export default function IndexPage() {
  const { t } = useTranslation();
  const { isDark, isUltra, antdThemeConfig } = useTheme();
  const { status, fetched, fetchError, refresh } = useStatusQuery();
  const { isMobile } = useMediaQuery();
  const [messageApi, messageContextHolder] = message.useMessage();
  useEffect(() => { setMessageInstance(messageApi); }, [messageApi]);

  const [accessLogEnable, setAccessLogEnable] = useState(false);
  const [devChannelEnable, setDevChannelEnable] = useState(false);
  const [panelUpdateInfo, setPanelUpdateInfo] = useState<PanelUpdateInfo>({
    currentVersion: '',
    latestVersion: '',
    updateAvailable: false,
  });

  const basePath = window.X_UI_BASE_PATH || '';

  const [logsOpen, setLogsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [panelUpdateOpen, setPanelUpdateOpen] = useState(false);
  const [sysHistoryOpen, setSysHistoryOpen] = useState(false);
  const [xrayMetricsOpen, setXrayMetricsOpen] = useState(false);
  const [xrayLogsOpen, setXrayLogsOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [configTextOpen, setConfigTextOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState(t('loading'));

  useEffect(() => {
    HttpUtil.post<{ accessLogEnable?: boolean; devChannelEnable?: boolean }>(
      '/panel/api/setting/defaultSettings',
    ).then((msg) => {
      if (msg?.success && msg.obj) {
        setAccessLogEnable(!!msg.obj.accessLogEnable);
        setDevChannelEnable(!!msg.obj.devChannelEnable);
      }
    });
    HttpUtil.get<PanelUpdateInfo>('/panel/api/server/getPanelUpdateInfo').then((msg) => {
      if (msg?.success && msg.obj) setPanelUpdateInfo(msg.obj);
    });
  }, []);

  const isReseller = (typeof window !== 'undefined' && typeof window.X_UI_BASE_PATH !== 'undefined')
    ? !!window.X_UI_IS_RESELLER
    : !!localStorage.getItem('daltoon_current_admin');

  const currentAdminRaw = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('daltoon_current_admin');
      if (stored) return stored;
      if (window.X_UI_RESELLER_USER) {
        return JSON.stringify({ username: window.X_UI_RESELLER_USER });
      }
    }
    return '{}';
  }, []);

  const setBusy = useCallback(
    ({ busy, tip }: { busy: boolean; tip?: string }) => {
      setLoading(busy);
      if (tip) setLoadingTip(tip);
    },
    [],
  );

  const stopXray = useCallback(async () => {
    setBusy({ busy: true, tip: t('pages.index.stoppingXray', { defaultValue: 'Stopping Xray...' }) });
    try {
      const res = await HttpUtil.post('/panel/api/server/stopXrayService', undefined, { silent: true });
      if (res?.success) {
        messageApi.success(res.msg || t('pages.index.stoppedSuccess', { defaultValue: 'Xray stopped successfully.' }));
      } else {
        messageApi.info(t('pages.index.stopXrayNotice', { defaultValue: 'Xray service is stopping.' }));
      }
    } catch {
      messageApi.info(t('pages.index.stopXrayNotice', { defaultValue: 'Xray service is stopping.' }));
    } finally {
      setTimeout(async () => {
        try {
          await refresh();
        } catch {
          // ignore
        }
        setBusy({ busy: false });
      }, 1000);
    }
  }, [messageApi, refresh, setBusy, t]);

  const restartXray = useCallback(async () => {
    setBusy({ busy: true, tip: t('pages.index.restartingXray', { defaultValue: 'Restarting Xray...' }) });
    try {
      const res = await HttpUtil.post('/panel/api/server/restartXrayService', undefined, { silent: true });
      if (res?.success) {
        messageApi.success(res.msg || t('pages.index.restartedSuccess', { defaultValue: 'Xray restarted successfully.' }));
      } else {
        messageApi.info(t('pages.index.restartingXrayNotice', { defaultValue: 'Xray service is restarting. Connection may briefly pause.' }));
      }
    } catch {
      messageApi.info(t('pages.index.restartingXrayNotice', { defaultValue: 'Xray service is restarting. Connection may briefly pause.' }));
    } finally {
      setTimeout(async () => {
        try {
          await refresh();
        } catch {
          // ignore
        }
        setBusy({ busy: false });
      }, 1500);
    }
  }, [messageApi, refresh, setBusy, t]);

  async function handleChannelChange(dev: boolean) {
    const res = await HttpUtil.post('/panel/api/server/setUpdateChannel', { dev });
    if (!res?.success) return;
    setDevChannelEnable(dev);
    const msg = await HttpUtil.get<PanelUpdateInfo>('/panel/api/server/getPanelUpdateInfo');
    if (msg?.success && msg.obj) setPanelUpdateInfo(msg.obj);
  }

  async function copyConfig() {
    const ok = await ClipboardManager.copyText(configText || '');
    if (ok) messageApi.success('Copied');
  }

  function downloadConfig() {
    FileManager.downloadTextFile(configText, 'config.json');
  }

  const pageClass = `index-page ${isDark ? 'is-dark' : ''} ${isUltra ? 'is-ultra' : ''}`.trim();

  return (
    <ConfigProvider theme={antdThemeConfig}>
      {messageContextHolder}
      <Layout className={pageClass}>
        <AppSidebar />

        <Layout className="content-shell">
          <Layout.Content className="content-area">
            <Spin
              spinning={loading || !fetched}
              delay={200}
              description={loading ? loadingTip : t('loading')}
              size="large"
            >
              {!fetched ? (
                <div className="loading-spacer" />
              ) : fetchError ? (
                <Result
                  status="error"
                  title={t('somethingWentWrong')}
                  subTitle={fetchError}
                  extra={<Button type="primary" onClick={refresh}>{t('refresh')}</Button>}
                />
              ) : isReseller ? (
                <ResellerDashboard currentAdminRaw={currentAdminRaw || '{}'} status={status} />
              ) : (
                <div className="index-content">
                  <StatusCard status={status} isMobile={isMobile} />
                  <div style={{ marginTop: 16 }}>
                    <XrayStatusCard
                      status={status}
                      isMobile={isMobile}
                      accessLogEnable={accessLogEnable}
                      onStopXray={stopXray}
                      onRestartXray={restartXray}
                      onOpenLogs={() => setLogsOpen(true)}
                      onOpenXrayLogs={() => setXrayLogsOpen(true)}
                      onOpenVersionSwitch={() => setVersionOpen(true)}
                    />
                  </div>
                </div>
              )}
            </Spin>
          </Layout.Content>
        </Layout>

        <LazyMount when={panelUpdateOpen}>
          <PanelUpdateModal
            open={panelUpdateOpen}
            info={panelUpdateInfo}
            devChannelEnable={devChannelEnable}
            onChannelChange={handleChannelChange}
            onClose={() => setPanelUpdateOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>
        <LazyMount when={logsOpen}>
          <LogModal open={logsOpen} onClose={() => setLogsOpen(false)} />
        </LazyMount>
        <LazyMount when={backupOpen}>
          <BackupModal
            open={backupOpen}
            basePath={basePath}
            onClose={() => setBackupOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>
        <LazyMount when={sysHistoryOpen}>
          <SystemHistoryModal
            open={sysHistoryOpen}
            status={status}
            onClose={() => setSysHistoryOpen(false)}
          />
        </LazyMount>
        <LazyMount when={xrayMetricsOpen}>
          <XrayMetricsModal open={xrayMetricsOpen} onClose={() => setXrayMetricsOpen(false)} />
        </LazyMount>
        <LazyMount when={xrayLogsOpen}>
          <XrayLogModal open={xrayLogsOpen} onClose={() => setXrayLogsOpen(false)} />
        </LazyMount>
        <LazyMount when={versionOpen}>
          <VersionModal
            open={versionOpen}
            status={status}
            onClose={() => setVersionOpen(false)}
            onBusy={setBusy}
          />
        </LazyMount>

        <LazyMount when={configTextOpen}>
          <Modal
            open={configTextOpen}
            title={t('pages.index.config')}
            width={isMobile ? '100%' : 900}
            style={isMobile
              ? { top: 20, maxWidth: 'calc(100vw - 16px)' }
              : { top: 20 }}
            onCancel={() => setConfigTextOpen(false)}
            footer={[
              <Button
                key="download"
                onClick={downloadConfig}
                size={isMobile ? 'small' : 'middle'}
                icon={<CloudDownloadOutlined />}
              >
                {isMobile ? 'Download' : 'config.json'}
              </Button>,
              <Button
                key="copy"
                type="primary"
                onClick={copyConfig}
                size={isMobile ? 'small' : 'middle'}
                icon={<CopyOutlined />}
              >
                Copy
              </Button>,
            ]}
          >
            <JsonEditor
              value={configText}
              onChange={setConfigText}
              minHeight={isMobile ? '300px' : 'calc(100vh - 220px)'}
              maxHeight={isMobile ? '70vh' : 'calc(100vh - 220px)'}
              readOnly
            />
          </Modal>
        </LazyMount>
      </Layout>
    </ConfigProvider>
  );
}
