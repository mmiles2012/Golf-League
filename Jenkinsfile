pipeline {
  agent any

  environment {
    NODE_ENV = 'test'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Unit & Integration Tests') {
      steps {
        sh 'npm run test'
      }
    }
    stage('Playwright E2E Tests') {
      steps {
        sh 'npx playwright install --with-deps'
        sh 'npx playwright test tests/e2e'
      }
    }
  }
  post {
    always {
      junit '**/test-results/**/*.xml'
      archiveArtifacts artifacts: 'tests/e2e/test-results/**', allowEmptyArchive: true
    }
  }
}
