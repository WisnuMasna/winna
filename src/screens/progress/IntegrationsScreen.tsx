import React from 'react';
import { Text } from 'react-native';
import { Body, Button, Card, H1, Label, Pill, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useFeedback } from '../../state/FeedbackContext';
import { providers, NotConfiguredError } from '../../providers';

export function IntegrationsScreen() {
  const t = useTheme();
  const { confirm } = useFeedback();

  const onConnect = async (name: string, authorize: () => Promise<void>) => {
    try {
      await authorize();
    } catch (e) {
      const msg = e instanceof NotConfiguredError ? e.message : e instanceof Error ? e.message : String(e);
      await confirm({ title: `${name} not connected`, message: msg, confirmLabel: 'OK', cancelLabel: 'Close' });
    }
  };

  return (
    <ScreenScroll>
      <H1>Integrations</H1>
      <Body muted>
        Activity sources plug in behind a shared interface. Strava is scaffolded and ready to wire once API
        credentials are added; Garmin follows the same path after partner approval.
      </Body>

      {providers.map((p) => (
        <Card key={p.key}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }}>{p.displayName}</Text>
            <Pill text={p.isConfigured() ? 'configured' : 'not configured'} color={p.isConfigured() ? t.colors.success : t.colors.textMuted} />
          </Row>
          <Body muted style={{ marginTop: t.spacing(1), marginBottom: t.spacing(2) }}>
            {p.key === 'strava'
              ? 'Pull runs (distance, duration, pace, HR) automatically. Add a Strava app client ID to enable.'
              : 'Requires Garmin Health API partner approval and a server-side token exchange.'}
          </Body>
          <Button
            title={`Connect ${p.displayName}`}
            variant="secondary"
            small
            onPress={() => onConnect(p.displayName, () => p.authorize())}
          />
        </Card>
      ))}
    </ScreenScroll>
  );
}
