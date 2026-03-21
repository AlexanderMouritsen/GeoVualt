# Data Quality Checklist

Purpose: Track temporary metric coverage gaps in countries data and close them before broad public launch.

## Current policy

- No runtime API calls in app pages.
- Build-time data pipeline in scripts/fetch-data.mjs is the source of truth.
- Metrics with low country coverage should not silently stay weak.

## Coverage target

- Target for tracked metrics: at least 120 countries with non-null values.
- The fetch script now prints warnings for tracked metrics under this threshold.

## Tracked metrics to improve

- avgTemperatureCelsius
- happinessScore
- incarcerationRatePer100k
- gdpUsd
- gdpPerCapitaUsd
- lifeExpectancy
- forestAreaPercent
- co2EmissionsPerCapita
- renewableEnergyPercent
- internetUsersPercent
- literacyRatePercent
- tourismArrivals
- militaryExpenditureGdpPercent

## Follow-up tasks

- Replace tiny supplemental maps with larger source files by country code.
- Document source and timestamp for each supplemental metric file.
- Add pre-commit or CI check that fails if critical metrics fall below threshold.
- In game metric picker, avoid low-coverage metrics until coverage is healthy.

## Definition of done

- All tracked metrics meet threshold.
- GeoRankle metric selection excludes no metrics due to missing coverage.
- Pipeline run produces no coverage warnings.
