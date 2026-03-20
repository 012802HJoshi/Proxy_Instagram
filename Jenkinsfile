pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    APP_NAME = "youtube-shorts-api"
    APP_DIR = "/var/www/youtube-shorts-api"
    PACKAGE_NAME = "release.tar.gz"
  }

  stages {
    stage("Checkout (SCM)") {
      steps {
        checkout scm
      }
    }

    stage("Build Check") {
      steps {
        sh "npm ci"
      }
    }

    stage("Package") {
      steps {
        sh '''
          tar --exclude=".git" \
              --exclude="node_modules" \
              --exclude="cache" \
              --exclude=".env" \
              -czf "$PACKAGE_NAME" .
        '''
      }
    }

    stage("Deploy To VM") {
      steps {
        withCredentials([
          file(credentialsId: "YOUTUBE_SHORTS_ENV_FILE", variable: "ENV_FILE"),
          string(credentialsId: "VM_HOST", variable: "VM_HOST"),
          string(credentialsId: "VM_USER", variable: "VM_USER")
        ]) {
          sshagent(credentials: ["VM_SSH_KEY"]) {
            sh '''
              scp -o StrictHostKeyChecking=no "$PACKAGE_NAME" "$VM_USER@$VM_HOST:/tmp/$PACKAGE_NAME"
              scp -o StrictHostKeyChecking=no "$ENV_FILE" "$VM_USER@$VM_HOST:/tmp/.env"

              ssh -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" '
                set -e
                mkdir -p "'"$APP_DIR"'"
                tar -xzf "/tmp/'"$PACKAGE_NAME"'" -C "'"$APP_DIR"'"
                cp /tmp/.env "'"$APP_DIR"'/.env"
                cd "'"$APP_DIR"'"
                npm ci --omit=dev
                pm2 reload "'"$APP_NAME"'" || pm2 start src/server.js --name "'"$APP_NAME"'"
                pm2 save
              '
            '''
          }
        }
      }
    }
  }

  post {
    success {
      echo "Deployment completed successfully."
    }
    failure {
      echo "Deployment failed. Check Jenkins console logs."
    }
  }
}