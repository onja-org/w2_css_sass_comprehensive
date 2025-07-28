const puppeteer = require("puppeteer");
const path = require("path");

// Colors for console output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

const checks = [
  {
    name: "CSS file compiles and loads",
    description: "Your SCSS compiles to CSS and is linked in HTML",
    test: checkCSSLoads,
  },
  {
    name: "Header has custom styling",
    description: "Site header moves beyond browser defaults",
    test: checkHeaderStyling,
  },
  {
    name: "Interactive states exist",
    description: "Buttons and inputs have hover or focus effects",
    test: checkInteractiveStates,
  },
  {
    name: "Typography is customized",
    description: "Custom fonts, sizes, or spacing applied",
    test: checkTypography,
  },
  {
    name: "Layout structure is in place",
    description: "Main sections have custom positioning or spacing",
    test: checkLayoutStructure,
  },
];

async function runProgressTests() {
  console.log(`${colors.bold}${colors.blue}🧪 Checking your SCSS progress...${colors.reset}\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, "../index.html");
    await page.goto(`file://${htmlPath}`);

    let passed = 0;
    let total = checks.length;

    for (const check of checks) {
      try {
        const result = await check.test(page);
        if (result.success) {
          console.log(`${colors.green}✅ ${check.name}${colors.reset}`);
          if (result.details) {
            console.log(`   ${colors.green}→ ${result.details}${colors.reset}`);
          }
          passed++;
        } else {
          console.log(`${colors.yellow}⏳ ${check.name}${colors.reset}`);
          console.log(`   ${colors.yellow}→ ${result.reason || check.description}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ ${check.name}${colors.reset}`);
        console.log(`   ${colors.red}→ Test error: ${error.message}${colors.reset}`);
      }
      console.log(""); // Empty line for readability
    }

    // Summary
    console.log(`${colors.bold}📊 Progress Summary:${colors.reset}`);
    console.log(`${colors.green}${passed}${colors.reset} / ${total} checks passing`);

    if (passed === total) {
      console.log(
        `${colors.green}${colors.bold}🎉 Excellent work! Your design system is looking professional!${colors.reset}`
      );
    } else if (passed >= total * 0.7) {
      console.log(
        `${colors.yellow}${colors.bold}💪 Great progress! Keep going to polish the remaining areas.${colors.reset}`
      );
    } else if (passed >= total * 0.4) {
      console.log(`${colors.blue}${colors.bold}🚀 Good start! You're building solid foundations.${colors.reset}`);
    } else {
      console.log(
        `${colors.blue}${colors.bold}🎯 Just getting started? Check that your CSS is linked and compiling.${colors.reset}`
      );
    }
  } catch (error) {
    console.error(`${colors.red}Failed to run tests: ${error.message}${colors.reset}`);
  } finally {
    await browser.close();
  }
}

// Individual test functions
async function checkCSSLoads(page) {
  // Check if CSS file exists and is linked
  const cssLoaded = await page.evaluate(() => {
    const link = document.querySelector('link[rel="stylesheet"]');
    if (!link) return { loaded: false, reason: "No CSS file linked in HTML" };

    // Check if the link is commented out
    const htmlContent = document.documentElement.outerHTML;
    if (htmlContent.includes('<!-- <link rel="stylesheet"')) {
      return { loaded: false, reason: "CSS link is commented out - uncomment it after compiling!" };
    }

    return { loaded: true };
  });

  if (!cssLoaded.loaded) {
    return { success: false, reason: cssLoaded.reason };
  }

  // Check if some basic custom styling exists
  const hasCustomStyling = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);

    // Check if body has any custom font family (not just browser defaults)
    const hasCustomFont =
      !computed.fontFamily.includes("Times") && computed.fontFamily !== "serif" && computed.fontFamily !== "sans-serif";

    return hasCustomFont || computed.backgroundColor !== "rgba(0, 0, 0, 0)";
  });

  if (!hasCustomStyling) {
    return { success: false, reason: "CSS loads but no custom styling detected yet" };
  }

  return { success: true, details: "CSS successfully compiled and loaded" };
}

async function checkHeaderStyling(page) {
  const headerStyling = await page.evaluate(() => {
    const header = document.querySelector(".site-header");
    if (!header) return { styled: false, reason: "Header element not found" };

    const computed = window.getComputedStyle(header);

    // Check for any custom styling
    const hasBackground = computed.backgroundColor !== "rgba(0, 0, 0, 0)";
    const hasPadding = parseFloat(computed.paddingTop) > 0 || parseFloat(computed.paddingBottom) > 0;
    const hasBorder = computed.borderBottomWidth !== "0px" || computed.borderTopWidth !== "0px";

    return {
      styled: hasBackground || hasPadding || hasBorder,
      hasBackground,
      hasPadding,
      hasBorder,
    };
  });

  if (!headerStyling.styled) {
    return { success: false, reason: "Header appears to use browser defaults" };
  }

  const details = [];
  if (headerStyling.hasBackground) details.push("background color");
  if (headerStyling.hasPadding) details.push("custom padding");
  if (headerStyling.hasBorder) details.push("border styling");

  return {
    success: true,
    details: `Custom styling detected: ${details.join(", ")}`,
  };
}

async function checkInteractiveStates(page) {
  const interactiveStates = await page.evaluate(async () => {
    // Test actual hover/focus behavior on buttons and inputs
    const buttons = document.querySelectorAll('button, .component-form__button');
    const inputs = document.querySelectorAll('input, select, textarea');
    
    let hasHoverEffects = false;
    let hasFocusEffects = false;
    let testedElements = 0;
    
    // Helper function to get relevant style properties
    function getInteractiveStyles(element) {
      const computed = window.getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        color: computed.color,
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow
      };
    }
    
    // Helper function to check if style change is a custom effect (not browser default)
    function isCustomEffect(initial, changed) {
      // Ignore browser default focus outlines (usually auto or -webkit-focus-ring-color)
      if (initial.outline !== changed.outline) {
        if (changed.outline.includes('auto') || 
            changed.outline.includes('-webkit-focus-ring-color') ||
            changed.outline.includes('ButtonText')) {
          return false; // Browser default
        }
        return true; // Custom outline
      }
      
      // Check for meaningful color changes (not just browser defaults)
      if (initial.backgroundColor !== changed.backgroundColor ||
          initial.borderColor !== changed.borderColor ||
          initial.color !== changed.color) {
        // Make sure it's not just a tiny imperceptible change
        return true;
      }
      
      // Check for custom box-shadow (not browser defaults)
      if (initial.boxShadow !== changed.boxShadow) {
        if (changed.boxShadow === 'none' || initial.boxShadow === 'none') {
          return true; // Definite change
        }
        // Check if it's a meaningful shadow change
        return !changed.boxShadow.includes('rgba(0, 0, 0, 0)');
      }
      
      return false;
    }
    
    // Test a few buttons for hover effects
    for (let i = 0; i < Math.min(buttons.length, 3); i++) {
      const button = buttons[i];
      const initialStyles = getInteractiveStyles(button);
      
      // Simulate hover
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 50)); // Brief delay for transitions
      
      const hoverStyles = getInteractiveStyles(button);
      
      // Check if any style property changed with custom styling
      if (isCustomEffect(initialStyles, hoverStyles)) {
        hasHoverEffects = true;
      }
      
      // Clean up
      button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      testedElements++;
    }
    
    // Test a few inputs for focus effects
    for (let i = 0; i < Math.min(inputs.length, 3); i++) {
      const input = inputs[i];
      const initialStyles = getInteractiveStyles(input);
      
      // Simulate focus
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 50)); // Brief delay for transitions
      
      const focusStyles = getInteractiveStyles(input);
      
      // Check if any style property changed with custom styling
      if (isCustomEffect(initialStyles, focusStyles)) {
        hasFocusEffects = true;
      }
      
      // Clean up
      input.blur();
      testedElements++;
    }
    
    return { 
      hasHoverEffects,
      hasFocusEffects,
      testedElements,
      totalButtons: buttons.length,
      totalInputs: inputs.length
    };
  });

  if (!interactiveStates.hasHoverEffects && !interactiveStates.hasFocusEffects) {
    return { 
      success: false, 
      reason: `No interactive effects detected on ${interactiveStates.testedElements} tested elements` 
    };
  }

  const details = [];
  if (interactiveStates.hasHoverEffects) details.push("hover effects");
  if (interactiveStates.hasFocusEffects) details.push("focus states");

  return {
    success: true,
    details: `Interactive states working: ${details.join(", ")}`,
  };
}

async function checkTypography(page) {
  const typography = await page.evaluate(() => {
    const body = document.body;
    const headings = document.querySelectorAll("h1, h2, h3");

    const bodyStyles = window.getComputedStyle(body);

    // Check if custom font family is applied
    const hasCustomFont =
      !bodyStyles.fontFamily.includes("Times") &&
      bodyStyles.fontFamily !== "serif" &&
      bodyStyles.fontFamily !== "sans-serif" &&
      bodyStyles.fontFamily.length > 10; // Indicates a real font stack

    // Check if headings have custom styling
    let customHeadings = 0;
    headings.forEach(heading => {
      const styles = window.getComputedStyle(heading);
      if (
        parseFloat(styles.marginBottom) !== parseFloat(styles.marginTop) ||
        styles.fontWeight !== "700" || // Not just bold
        styles.lineHeight !== "normal"
      ) {
        customHeadings++;
      }
    });

    return {
      hasCustomFont,
      customHeadings,
      totalHeadings: headings.length,
    };
  });

  if (!typography.hasCustomFont && typography.customHeadings === 0) {
    return { success: false, reason: "Typography appears to use browser defaults" };
  }

  const details = [];
  if (typography.hasCustomFont) details.push("custom font family");
  if (typography.customHeadings > 0) details.push(`${typography.customHeadings} styled headings`);

  return {
    success: true,
    details: `Typography customization: ${details.join(", ")}`,
  };
}

async function checkLayoutStructure(page) {
  const layout = await page.evaluate(() => {
    const mainContent = document.querySelector(".main-content__container");
    const header = document.querySelector(".site-header");
    const sections = document.querySelectorAll("section");

    if (!mainContent) return { structured: false, reason: "Main content container not found" };

    const mainStyles = window.getComputedStyle(mainContent);
    const headerStyles = window.getComputedStyle(header);

    // Check for layout styling
    const hasGridOrFlex =
      mainStyles.display === "grid" ||
      mainStyles.display === "flex" ||
      mainStyles.display === "inline-grid" ||
      mainStyles.display === "inline-flex";

    const hasCustomSpacing =
      parseFloat(mainStyles.gap) > 0 || parseFloat(mainStyles.marginTop) > 0 || parseFloat(mainStyles.paddingTop) > 16; // More than minimal

    const hasMaxWidth = mainStyles.maxWidth !== "none";

    return {
      structured: hasGridOrFlex || hasCustomSpacing || hasMaxWidth,
      hasGridOrFlex,
      hasCustomSpacing,
      hasMaxWidth,
      sectionsCount: sections.length,
    };
  });

  if (!layout.structured) {
    return { success: false, reason: "Layout appears to use browser default positioning" };
  }

  const details = [];
  if (layout.hasGridOrFlex) details.push("CSS Grid or Flexbox");
  if (layout.hasCustomSpacing) details.push("custom spacing");
  if (layout.hasMaxWidth) details.push("container max-width");

  return {
    success: true,
    details: `Layout structure detected: ${details.join(", ")}`,
  };
}

// Run the tests
runProgressTests().catch(console.error);
