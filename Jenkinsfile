pipeline {
    agent any

    environment {
        APP_DIR = "/var/www/proxy-downloader"
    }

    stages {

        stage('Environment Setup') {
            steps {
                withCredentials([file(credentialsId: 'ENV_PRODUCTION', variable: 'ENV_FILE')]) {
                    sh '''
                        cp $ENV_FILE .env
                        chmod 644 .env
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    mkdir -p ${APP_DIR}

                    rsync -az --delete \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        ./ ${APP_DIR}/

                    cd ${APP_DIR}
                    npm ci --omit=dev
                """
            }
        }

        stage('Restart Server') {
            steps {
               sh """
            sudo -H -u harshitjoshi2002 bash -lc '
                cd ${APP_DIR}
                pm2 reload instagram-api --update-env || pm2 start npm --name instagram-api -- run start
                pm2 save
            '
        """
            }
        }
    }
}