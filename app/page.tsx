export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  );
}

import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";

function Hero() {
  return (
    <Container size="sm" py={80}>
      <Stack gap="md">
        <Title order={1}>Practice Companion</Title>
        <Text c="dimmed">
          A Next.js + Mantine starter. Next up: add your first practice flow.
        </Text>
        <Group>
          <Button component="a" href="/practice">
            Start practicing
          </Button>
          <Button
            variant="light"
            component="a"
            href="https://mantine.dev/guides/next/"
            target="_blank"
            rel="noreferrer"
          >
            Mantine + Next.js guide
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
