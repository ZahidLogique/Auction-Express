.PHONY: help test test\:login test-headed test-headless test-ui test-debug test-file test-grep report report\:serve clean install install-browsers

# Default target
help:
	@echo ""
	@echo "TTA Backoffice — QA Automation"
	@echo "================================"
	@echo ""
	@echo "Test Commands:"
	@echo "  make test              - Jalankan semua test"
	@echo "  make test:login        - Jalankan test login saja"
	@echo "  make test-headed       - Jalankan dengan browser terlihat"
	@echo "  make test-headless     - Jalankan tanpa browser (default)"
	@echo "  make test-ui           - Mode UI interaktif Playwright"
	@echo "  make test-debug        - Mode debug step-by-step"
	@echo "  make test-file FILE=   - Jalankan file test tertentu"
	@echo "  make test-grep GREP=   - Jalankan test berdasarkan TC ID/nama"
	@echo ""
	@echo "Report Commands:"
	@echo "  make report            - Generate + buka Allure Report"
	@echo "  make report:serve      - Serve Allure Report langsung"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make install           - Install semua dependencies"
	@echo "  make install-browsers  - Install Playwright browsers"
	@echo "  make clean             - Hapus semua hasil test dan report"
	@echo ""

# Setup
install:
	@echo "Installing dependencies..."
	npm install

install-browsers:
	@echo "Installing Playwright browsers..."
	npx playwright install chromium

# Test Commands
test:
	@echo "Running all tests..."
	npx playwright test

test\:login:
	@echo "Running login tests..."
	npx playwright test tests/auth/login.spec.ts

test-headed:
	@echo "Running tests in headed mode..."
	npx playwright test --headed

test-headless:
	@echo "Running tests in headless mode..."
	npx playwright test --headed=false

test-ui:
	@echo "Opening Playwright UI mode..."
	npx playwright test --ui

test-debug:
	@echo "Running tests in debug mode..."
	npx playwright test --debug

test-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: FILE parameter wajib diisi"; \
		echo "Contoh: make test-file FILE=tests/auth/login.spec.ts"; \
		exit 1; \
	fi
	@echo "Running: $(FILE)"
	npx playwright test $(FILE)

test-grep:
	@if [ -z "$(GREP)" ]; then \
		echo "Error: GREP parameter wajib diisi"; \
		echo "Contoh: make test-grep GREP=TC-LOGIN-001"; \
		exit 1; \
	fi
	@echo "Running tests matching: $(GREP)"
	npx playwright test --grep "$(GREP)"

# Report Commands
report:
	@echo "Generating Allure Report..."
	npx allure generate allure-results --clean -o allure-report
	npx allure open allure-report

report\:serve:
	@echo "Serving Allure Report..."
	npx allure serve allure-results

# Clean
clean:
	@echo "Cleaning all test results and reports..."
	rm -rf test-results/
	rm -rf playwright-report/
	rm -rf allure-results/
	rm -rf allure-report/
	rm -rf screenshots/
	@echo "Clean completed."
