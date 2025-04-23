import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import styles from './DiscordLinkPage.module.css';

const DiscordLinkPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('Verifying your link...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setMessage('No link token provided.');
            setIsError(true);
            setIsLoading(false);
            return;
        }

        const verifyToken = async () => {
            setIsLoading(true);
            setMessage('Linking your Discord account...');
            setIsError(false);

            try {
                const response = await fetch(`/api/auth/discord-link?token=${token}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                const data = await response.json();

                if (response.ok) {
                    setMessage(data.message || 'Discord account linked successfully!');
                    setIsError(false);
                } else {
                    setMessage(data.message || 'Failed to link Discord account. The link may be invalid or expired.');
                    setIsError(true);
                }
            } catch (error) {
                console.error('Error verifying Discord link token:', error);
                setMessage('An error occurred while trying to link your account. Please try again later.');
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, [searchParams]);

    return (
        <div className={styles.container}>
            <h1>Discord Account Linking</h1>
            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <>
                    <p className={isError ? styles.errorMessage : styles.successMessage}>
                        {message}
                    </p>
                    {!isError && (
                        <Link to="/dashboard">Go to Dashboard</Link>
                    )}
                    {isError && (
                        <Link to="/">Go Home</Link>
                    )}
                </>
            )}
        </div>
    );
};

export default DiscordLinkPage;