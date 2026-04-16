import { Link } from "react-router-dom";
import { Button, Container, Paper, Stack, Typography } from "@mui/material";

const sections = [
  {
    id: "terms",
    title: "Terms of Service",
    body: [
      "By using MGU.ONE Events, you agree to follow server rules, competition policies, and all applicable laws in your region.",
      "Users are responsible for account security, submitted content accuracy, and conduct during events.",
      "MGU.ONE may suspend access for abuse, cheating, harassment, fraud, or attempts to disrupt platform operations.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Notice",
    body: [
      "We process registration data, profile data, and technical metadata solely for event operations, security, and moderation.",
      "Admin authentication credentials are stored in MongoDB with strong password hashing and encrypted identity fields.",
      "We do not sell personal data. Access is restricted to authorized operators for legitimate platform administration.",
    ],
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    body: [
      "We use essential HTTP-only session cookies for secure admin authentication.",
      "These cookies are required for login persistence and cannot be disabled without impacting protected features.",
      "Cookie settings and retention are aligned with security best practices and operational requirements.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    body: [
      "Do not upload malicious files, offensive material, or copyrighted content without proper authorization.",
      "Automated abuse, scraping, account takeover attempts, and cheating tools are strictly prohibited.",
      "Violation of these rules may lead to disqualification, account suspension, or permanent bans.",
    ],
  },
];

const LegalPage = () => {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.2 }}
        >
          Legal & Compliance
        </Typography>
        <Typography variant="h3" color="primary.main" sx={{ mt: 1 }}>
          MGU.ONE Policies
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
          This page outlines platform terms, privacy principles, cookie usage,
          and acceptable use requirements for MGU.ONE Events.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          Last updated: {lastUpdated}
        </Typography>
      </Paper>

      <Stack spacing={2} sx={{ mt: 3 }}>
        {sections.map((section) => (
          <Paper
            id={section.id}
            key={section.id}
            sx={{ p: { xs: 2, sm: 2.5 } }}
          >
            <Typography variant="h5" color="primary.main">
              {section.title}
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {section.body.map((paragraph) => (
                <Typography
                  key={paragraph}
                  variant="body2"
                  color="text.secondary"
                >
                  {paragraph}
                </Typography>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Button component={Link} to="/" variant="contained" sx={{ mt: 3 }}>
        Back to Events
      </Button>
    </Container>
  );
};

export default LegalPage;
