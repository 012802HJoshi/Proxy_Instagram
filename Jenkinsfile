pipeline {
    agent any

    environment {
        APP_DIR = "/var/www/proxy-downloader"
    }

    stages {

        stage('Clone Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/012802HJoshi/Proxy_Instagram'
            }
        }

        stage('Environment Setup') {
            steps {
                withCredentials([file(credentialsId: 'ENV_PRODUCTION', variable: 'ENV_FILE')]) {
                    sh '''
                        cp $ENV_FILE .env
                        chmod 600 .env
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    mkdir -p $APP_DIR

                    rsync -av --delete \
                    --exclude='.git' \
                    --exclude='node_modules' \
                    --exclude='.env' \
                    ./ $APP_DIR/

                    cd $APP_DIR
                    npm install --omit=dev
                '''
            }
        }

        stage('Restart Server') {
            steps {
                sh '''
                    cd $APP_DIR

                    pm2 reload instagram-api || pm2 start npm --name instagram-api -- run start:prod

                    pm2 save
                '''
            }
        }
    }
}