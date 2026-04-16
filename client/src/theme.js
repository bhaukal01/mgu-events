import { alpha, createTheme } from "@mui/material/styles";

const displayFont = '"Chakra Petch", "Trebuchet MS", sans-serif';
const bodyFont = '"Sora", "Segoe UI", sans-serif';

const ink = "#131921";
const steel = "#263445";
const panel = "#fffdf6";
const sand = "#d9d3c4";
const ember = "#d95f00";
const moss = "#6fa62c";
const sky = "#00a9c9";

const theme = createTheme({
    spacing: 8,
    shape: {
        borderRadius: 0,
    },
    palette: {
        mode: "light",
        primary: {
            main: steel,
            dark: ink,
            light: "#3a4f69",
            contrastText: "#f3f8ff",
        },
        secondary: {
            main: ember,
            dark: "#ad4500",
            light: "#f58a31",
            contrastText: "#fff8f2",
        },
        success: {
            main: moss,
            dark: "#558118",
            light: "#89c742",
        },
        warning: {
            main: "#d08b18",
            dark: "#99640d",
            light: "#efb04d",
        },
        error: {
            main: "#b3261e",
        },
        info: {
            main: sky,
        },
        background: {
            default: sand,
            paper: panel,
        },
        text: {
            primary: "#19212c",
            secondary: "#3b4a5f",
        },
        divider: alpha(ink, 0.3),
    },
    typography: {
        fontFamily: bodyFont,
        h1: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
        },
        h2: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.015em",
            textTransform: "uppercase",
        },
        h3: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h4: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.01em",
        },
        h5: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.008em",
        },
        h6: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.008em",
        },
        overline: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
        },
        button: {
            fontFamily: displayFont,
            fontWeight: 700,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                "*": {
                    boxSizing: "border-box",
                },
                "html, body, #root": {
                    minHeight: "100%",
                },
                body: {
                    margin: 0,
                    backgroundColor: sand,
                    backgroundImage: [
                        "linear-gradient(90deg, rgba(19, 25, 33, 0.07) 1px, transparent 1px)",
                        "linear-gradient(rgba(19, 25, 33, 0.07) 1px, transparent 1px)",
                        "linear-gradient(135deg, rgba(217, 95, 0, 0.07), rgba(111, 166, 44, 0.08))",
                    ].join(","),
                    backgroundSize: "24px 24px, 24px 24px, 100% 100%",
                    backgroundPosition: "-1px -1px, -1px -1px, 0 0",
                    color: "#19212c",
                },
                "::selection": {
                    backgroundColor: alpha(ember, 0.22),
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: `2px solid ${steel}`,
                    backgroundImage:
                        "linear-gradient(180deg, rgba(255, 253, 246, 1) 0%, rgba(243, 238, 226, 1) 100%)",
                    boxShadow: `6px 6px 0 ${alpha(ink, 0.24)}`,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: `2px solid ${steel}`,
                    boxShadow: `6px 6px 0 ${alpha(ink, 0.24)}`,
                    backgroundImage:
                        "linear-gradient(180deg, rgba(255, 253, 246, 1) 0%, rgba(243, 238, 226, 1) 100%)",
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: "transparent",
                    paddingInline: 16,
                    paddingBlock: 8,
                    transition:
                        "transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease",
                    "&:hover": {
                        transform: "translate(-1px, -1px)",
                    },
                    "&:active": {
                        transform: "translate(1px, 1px)",
                    },
                },
                containedPrimary: {
                    backgroundColor: steel,
                    borderColor: ink,
                    boxShadow: `4px 4px 0 ${alpha(ink, 0.35)}`,
                    "&:hover": {
                        backgroundColor: "#1f2c3c",
                        boxShadow: `6px 6px 0 ${alpha(ink, 0.35)}`,
                    },
                },
                containedSecondary: {
                    backgroundColor: ember,
                    borderColor: "#8e3700",
                    boxShadow: `4px 4px 0 ${alpha(ink, 0.28)}`,
                    "&:hover": {
                        backgroundColor: "#bb4f00",
                        boxShadow: `6px 6px 0 ${alpha(ink, 0.3)}`,
                    },
                },
                outlined: {
                    borderColor: steel,
                    color: steel,
                    backgroundColor: alpha("#ffffff", 0.65),
                    "&:hover": {
                        borderColor: ink,
                        backgroundColor: alpha("#ffffff", 0.9),
                    },
                },
                text: {
                    color: steel,
                    "&:hover": {
                        backgroundColor: alpha(steel, 0.1),
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    backgroundColor: "#fffdf7",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: alpha(steel, 0.55),
                        borderWidth: 2,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: steel,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: ember,
                        borderWidth: 2,
                    },
                },
                input: {
                    fontWeight: 500,
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontFamily: displayFont,
                    letterSpacing: "0.02em",
                    fontWeight: 600,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: alpha(steel, 0.4),
                    fontFamily: displayFont,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    borderWidth: 2,
                    borderStyle: "solid",
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontFamily: displayFont,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    color: "#1b2531",
                },
            },
        },
        MuiSkeleton: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
    },
});

export default theme;
